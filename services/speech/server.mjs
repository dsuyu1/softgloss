// Private pilot gateway. Azure credentials stay on the server.
import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
export function createGateway(env=process.env,send=fetch){
 const counts=new Map();
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const origin=env.SPEECH_ALLOWED_ORIGIN;
  if(!origin||req.headers.origin!==origin){res.writeHead(403);res.end();return;}
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  const supplied=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+(env.SPEECH_PILOT_TOKEN||''));
  if(!env.SPEECH_PILOT_TOKEN||env.SPEECH_PILOT_TOKEN.length<32||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){reply(401,{error:'Speech access denied.'});return;}
  if(req.method!=='POST'||!['/synthesize','/assess'].includes(req.url)){reply(404,{error:'Unknown speech operation.'});return;}
  if(!env.AZURE_SPEECH_KEY||! /^[a-z0-9]+$/.test(env.AZURE_SPEECH_REGION||'')){reply(503,{error:'Speech provider is not configured.'});return;}
  try{
   let size=0,parts=[];for await(const part of req){size+=part.length;if(size>3000000)throw Error('Request is too large.');parts.push(part);}
   const body=JSON.parse(Buffer.concat(parts).toString());
   if(typeof body.text!=='string'||!/[가-힣]/u.test(body.text)||body.text.length>500||!body.text.trim())throw Error('Use a Korean sentence of at most 500 characters.');
   let wav;
   if(req.url==='/assess'){
    if(typeof body.audio!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.audio))throw Error('Invalid recording.');
    wav=Buffer.from(body.audio,'base64');
    if(wav.length<3244||wav.length>1920044||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,16)!=='WAVEfmt '||wav.readUInt32LE(16)!==16||wav.readUInt16LE(20)!==1||wav.readUInt16LE(22)!==1||wav.readUInt32LE(24)!==16000||wav.readUInt16LE(34)!==16||wav.toString('ascii',36,40)!=='data'||wav.readUInt32LE(40)!==wav.length-44||wav.readUInt32LE(4)!==wav.length-8)throw Error('Use 0.1–60 seconds of mono 16 kHz PCM WAV.');
   }
   // Per-process pilot ceiling, deliberately not a production billing ledger.
   const day=new Date().toISOString().slice(0,10),count=counts.get(day)||0;
   const budget=Number(env.SPEECH_MAX_DAILY_REQUESTS||100);
   if(!Number.isSafeInteger(budget)||budget<1||count>=budget){reply(429,{error:'Daily pilot speech allowance reached.'});return;}
   counts.clear();counts.set(day,count+1);
   const headers={'Ocp-Apim-Subscription-Key':env.AZURE_SPEECH_KEY};let response;
   if(req.url==='/synthesize'){
    const escaped=body.text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    response=await send(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:'POST',headers:{...headers,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-16khz-32kbitrate-mono-mp3','User-Agent':'MalnaruSpeechPilot'},body:`<speak version="1.0" xml:lang="ko-KR"><voice name="ko-KR-SunHiNeural">${escaped}</voice></speak>`,signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('provider');const audio=Buffer.from(await response.arrayBuffer());if(audio.length>2000000)throw Error('provider');res.writeHead(200,{'Content-Type':'audio/mpeg'});res.end(audio);return;
   }
   response=await send(`https://${env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=ko-KR&format=detailed`,{method:'POST',headers:{...headers,'Content-Type':'audio/wav; codecs=audio/pcm; samplerate=16000','Pronunciation-Assessment':Buffer.from(JSON.stringify({ReferenceText:body.text,GradingSystem:'HundredMark',Granularity:'Word',Dimension:'Comprehensive',EnableMiscue:true})).toString('base64')},body:wav,signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw Error('provider');const result=await response.json(),best=result.NBest?.[0],scores=best?.PronunciationAssessment;
   if(result.RecognitionStatus!=='Success'||!scores){reply(422,{error:'No assessable speech. Try again in a quiet place.'});return;}
   const fields={pronunciation:'PronScore',accuracy:'AccuracyScore',fluency:'FluencyScore',completeness:'CompletenessScore'},grade={};
   for(const [key,field] of Object.entries(fields)){const v=scores[field];if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)throw Error('provider');grade[key]=v;}
   const words=(best.Words||[]).slice(0,200).map(w=>({word:String(w.Word||'').slice(0,200),error:String(w.PronunciationAssessment?.ErrorType||'').slice(0,60)}));
   reply(200,{provider:'Azure Speech',...grade,words});
  }catch(e){reply(e.message==='provider'||e.name==='TimeoutError'?502:400,{error:e.message==='provider'||e.name==='TimeoutError'?'Speech provider unavailable. No grade was produced.':'Invalid speech request.'});}
 });
}
if(import.meta.url===`file://${process.argv[1]}`)createGateway().listen(Number(process.env.PORT||8788),'127.0.0.1',()=>console.log('Speech pilot listening on loopback.'));
