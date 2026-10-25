// Original short fallback glosses, not a full dictionary. Imported data is loaded separately.
(() => {
globalThis.SG_PACK_ROWS = [];
const rows = [
['기자협회보','Journalists Association bulletin (publication name)','proper noun'],
['응답자','respondent; a person who answers a survey or question','noun'],
['지도부','leadership; a group of leaders','noun'],['하단','lower part; bottom section','noun'],['전원주택','a house in the countryside','noun'],['전원생활','life in the countryside','noun'],['청원인','petitioner','noun'],['신천지예수교증거장막성전','Shincheonji Church of Jesus (organization name)','proper noun'],

['명품','luxury goods; an outstanding product','noun'],['성역','sacred ground; a subject shielded from criticism','noun'],['끌어모으다','draw together; gather; attract','verb'],
['먹다','eat','verb'],['가다','go','verb'],['오다','come','verb'],['보다','see; watch','verb'],['읽다','read','verb'],['좋다','be good','adjective'],['좋아하다','like','verb'],['공부하다','study','verb'],['하다','do','verb'],['있다','exist; have','verb'],['없다','not exist; not have','adjective'],['마시다','drink','verb'],['자다','sleep','verb'],['사다','buy','verb'],['만나다','meet','verb'],['만들다','make','verb'],['듣다','hear; listen','verb'],['걷다','walk','verb'],['돕다','help','verb'],['모르다','not know','verb'],['아름답다','be beautiful','adjective'],['크다','be big','adjective'],['작다','be small','adjective'],['배우다','learn','verb'],['쓰다','write; use','verb'],
['학교','school','noun'],['학생','student','noun'],['한국어','Korean language','noun'],['한국','Korea','noun'],['책','book','noun'],['밥','cooked rice; meal','noun'],['물','water','noun'],['친구','friend','noun'],['사람','person','noun'],['집','home; house','noun'],['오늘','today','noun'],['내일','tomorrow','noun'],['어제','yesterday','noun'],['시간','time','noun'],['음식','food','noun'],['커피','coffee','noun'],['영화','movie','noun'],['음악','music','noun'],['이야기','story','noun'],['선생님','teacher','noun'],['도서관','library','noun'],['저','I (humble); that','pronoun'],['나','I (informal)','pronoun'],['우리','we; our','pronoun'],['정말','really','adverb'],['매일','every day','adverb'],['같이','together','adverb']
];
const forms = {
'편하려고':['편하다','-려고: intention/purpose in this expression; comfortable / at ease'],
'끌어모으려고':['끌어모으다','-(으)려고: purpose/intention connective'], '끌어모으려는':['끌어모으다','-(으)려는: intention/purpose modifying a noun'],
'먹었어요':['먹다','-었-: past tense','-어요: polite ending'], '먹어요':['먹다','-어요: polite ending'],
'가요':['가다','-아요: polite ending (contracted)'],'갔어요':['가다','-았-: past tense (contracted)','-어요: polite ending'],
'와요':['오다','-아요: polite ending (contracted)'],'왔어요':['오다','-았-: past tense (contracted)','-어요: polite ending'],
'봐요':['보다','-아요: polite ending (contracted)'],'봤어요':['보다','-았-: past tense (contracted)','-어요: polite ending'],
'읽어요':['읽다','-어요: polite ending'],'읽었어요':['읽다','-었-: past tense','-어요: polite ending'],
'좋아요':['좋다','-아요: polite ending'],'좋아해요':['좋아하다','-여요: polite ending (contracted)'],
'공부해요':['공부하다','-여요: polite ending (contracted)'],'공부했어요':['공부하다','-였-: past tense (contracted)','-어요: polite ending'],
'해요':['하다','-여요: polite ending (contracted)'],'했어요':['하다','-였-: past tense (contracted)','-어요: polite ending'],
'있어요':['있다','-어요: polite ending'],'없어요':['없다','-어요: polite ending'],
'마셔요':['마시다','-어요: polite ending (contracted)'],'마셨어요':['마시다','-었-: past tense (contracted)','-어요: polite ending'],
'자요':['자다','-아요: polite ending (contracted)'],'사요':['사다','-아요: polite ending (contracted)'],
'만나요':['만나다','-아요: polite ending (contracted)'],'만들어요':['만들다','-어요: polite ending'],
'들어요':['듣다','ㄷ irregular + -어요'],'걸어요':['걷다','ㄷ irregular + -어요'],'도와요':['돕다','ㅂ irregular + -아요'],
'몰라요':['모르다','르 irregular + -아요'],'아름다워요':['아름답다','ㅂ irregular + -어요'],
'커요':['크다','ㅡ deletion + -어요'],'작아요':['작다','-아요: polite ending'],'배워요':['배우다','-어요: polite ending (contracted)'],'써요':['쓰다','ㅡ deletion + -어요']
};
globalThis.SG_DATA = { entries: rows.map(([lemma,meaning,pos])=>({lemma,meaning,pos})), forms };
})();
