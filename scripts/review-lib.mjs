import {createHash} from 'node:crypto';
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function prepare(cases, lookup) {
 if (!Array.isArray(cases) || cases.length > 10000) throw Error('Provide an array of up to 10,000 cases.');
 const ids = new Set();
 return {version:1, cases:cases.map(c => {
  if (!c.id || ids.has(c.id) || typeof c.surface !== 'string' || !c.surface.trim() || c.surface.length > 80 || typeof c.context !== 'string' || typeof c.source !== 'string') throw Error('Each case needs a unique id, short surface, context and source.');
  ids.add(c.id);
  const analyses = lookup(c.surface).map(r => ({entryId:r.id || r.lemma, lemma:r.lemma, parts:r.parts, meaning:r.meaning}));
  return {id:c.id,surface:c.surface,context:c.context,source:c.source, analyses, fingerprint:hash(analyses), reviewer:'', independent:false, judgments:analyses.map(a=>({...a,verdict:'unreviewed'})), unknownReviewed:false};
 })};
}
export function grade(sheet, lookup) {
 if (sheet?.version !== 1 || !Array.isArray(sheet.cases)) throw Error('Unsupported review sheet.');
 const report = {cases:sheet.cases.length, reviewedCases:0, independentlyReviewedCases:0, unknownCases:0, supportedCases:0, reviewedSupportedCases:0, fullyCorrectSupportedCases:0, correctCandidates:0, incorrectCandidates:0, pendingCases:0};
 const ids=new Set();
 for(const c of sheet.cases) {
  if(ids.has(c.id))throw Error('Duplicate review case.');ids.add(c.id);
  const fresh = lookup(c.surface).map(r=>({entryId:r.id || r.lemma,lemma:r.lemma,parts:r.parts,meaning:r.meaning}));
  if(hash(fresh)!==c.fingerprint || hash(c.analyses)!==c.fingerprint)throw Error('Analyses changed; prepare a fresh sheet: '+c.id);
  const reviewed = typeof c.reviewer === 'string' && c.reviewer.trim() && c.source?.trim() && c.context?.trim();
  if(!fresh.length) {
   report.unknownCases++;
   if(reviewed && c.unknownReviewed===true) {report.reviewedCases++;if(c.independent===true)report.independentlyReviewedCases++;}
   else report.pendingCases++;
   continue;
  }
  report.supportedCases++;
  if(!Array.isArray(c.judgments) || c.judgments.length!==fresh.length || c.judgments.some((j,i)=> {const {verdict,...analysis}=j; return hash(analysis)!==hash(fresh[i]);}))throw Error('Judgments must match every candidate in order.');
  if(!reviewed || c.judgments.some(j=>!['correct','incorrect'].includes(j.verdict))) {report.pendingCases++;continue;}
  report.reviewedCases++; report.reviewedSupportedCases++; if(c.independent===true)report.independentlyReviewedCases++;
  const good=c.judgments.filter(j=>j.verdict==='correct').length;
  report.correctCandidates+=good;report.incorrectCandidates+=fresh.length-good;
  if(good===fresh.length)report.fullyCorrectSupportedCases++;
 }
 report.correctSupportedPercent=report.reviewedSupportedCases ? 100*report.fullyCorrectSupportedCases/report.reviewedSupportedCases : null;
 const candidates=report.correctCandidates+report.incorrectCandidates;
 report.candidatePrecisionPercent=candidates ? 100*report.correctCandidates/candidates : null;
 report.declaredIndependentReviewComplete=report.cases>=100 && report.independentlyReviewedCases===report.cases && report.pendingCases===0;
 report.accuracyTargetMet=report.declaredIndependentReviewComplete && report.correctSupportedPercent!==null && report.correctSupportedPercent>=95;
 return report;
}
