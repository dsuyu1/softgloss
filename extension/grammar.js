// Adapted teaching notes: CC BY-SA 4.0. See grammar source links and packaged license.
(() => {
 const base = 'https://en.wiktionary.org/wiki/';
 globalThis.SG_GRAMMAR = [
  {id:'topic', forms:['은','는'], title:'은 / 는 · topic or contrast', hint:'What is this statement about?', explanation:'This particle sets up the topic or contrasts it with something else. It does not by itself tell you who performs the action.', example:'저는 학생이에요. — As for me, I am a student.', source:base+encodeURIComponent('-은')+'#Korean'},
  {id:'subject', forms:['이','가'], title:'이 / 가 · subject', hint:'Which person or thing is being described?', explanation:'This particle can mark the subject of a verb or adjective. Its role differs from marking a topic; the intended emphasis depends on the surrounding conversation.', example:'책이 있어요. — There is a book.', source:base+encodeURIComponent('-이')+'#Korean'},
  {id:'object', forms:['을','를'], title:'을 / 를 · object', hint:'What is the action directed at?', explanation:'This particle commonly marks the direct object. Korean and English verbs do not always take the same kinds of objects.', example:'책을 읽어요. — I read a book.', source:base+encodeURIComponent('-을')+'#Korean'}
 ];
})();
