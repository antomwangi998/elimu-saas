// ============================================================
// ElimuSaaS — COMPLETE Demo Seed v3
// All 30 schools, all tables, full QA data
// ============================================================
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

let _pool = null;
async function q(sql, p = []) {
  if (!_pool) {
    try { const { getPool } = require('../config/database'); return getPool().query(sql, p); }
    catch(e) {
      const { Pool } = require('pg'); require('dotenv').config();
      _pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false }});
      return _pool.query(sql, p);
    }
  }
  return _pool.query(sql, p);
}

const rand    = arr => arr[Math.floor(Math.random()*arr.length)];
const randInt = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const randFloat=(a,b,d=1)=>parseFloat((Math.random()*(b-a)+a).toFixed(d));
const pick    = (n,arr) => [...arr].sort(()=>Math.random()-0.5).slice(0,n);

function gradeFromMarks(m) {
  if(m>=75)return{g:'A',  pts:12};if(m>=70)return{g:'A-',pts:11};if(m>=65)return{g:'B+',pts:10};
  if(m>=60)return{g:'B',  pts:9}; if(m>=55)return{g:'B-',pts:8}; if(m>=50)return{g:'C+',pts:7};
  if(m>=45)return{g:'C',  pts:6}; if(m>=40)return{g:'C-',pts:5}; if(m>=35)return{g:'D+',pts:4};
  if(m>=30)return{g:'D',  pts:3}; if(m>=25)return{g:'D-',pts:2}; return{g:'E',pts:1};
}

// ─────────────────────────────────────────────────────────────
const SCHOOLS = [
  {name:'Alliance High School',       code:'ALLIANCE01',county:'Kiambu',  boarding:'boarding',gender:'boys',  mean:72},
  {name:'Moi High Kabarak',           code:'KABARAK01', county:'Nakuru',  boarding:'boarding',gender:'boys',  mean:68},
  {name:'Kenya High School',          code:'KENYAHI01', county:'Nairobi', boarding:'boarding',gender:'girls', mean:70},
  {name:'Strathmore School',          code:'STRATH001', county:'Nairobi', boarding:'day',     gender:'mixed', mean:65},
  {name:'Brookhouse School',          code:'BROOKHS01', county:'Nairobi', boarding:'mixed',   gender:'mixed', mean:63},
  {name:'Maranda High School',        code:'MARANDA01', county:'Siaya',   boarding:'boarding',gender:'boys',  mean:71},
  {name:'Mugoiri Girls High',         code:'MUGOIRI01', county:'Muranga', boarding:'boarding',gender:'girls', mean:65},
  {name:'Light Academy',              code:'LIGHTAC01', county:'Nairobi', boarding:'day',     gender:'mixed', mean:61},
  {name:'Kapsabet Boys High',         code:'KAPSBT001', county:'Nandi',   boarding:'boarding',gender:'boys',  mean:67},
  {name:'Maryhill Girls High',        code:'MARYHIL01', county:'Thika',   boarding:'boarding',gender:'girls', mean:66},
  {name:'Anester Boys High',          code:'ANESTR001', county:'Kisumu',  boarding:'boarding',gender:'boys',  mean:60},
  {name:'Aga Khan Academy',           code:'AGAKHN001', county:'Mombasa', boarding:'mixed',   gender:'mixed', mean:64},
  {name:'Pangani Girls High',         code:'PANGNI001', county:'Nairobi', boarding:'day',     gender:'girls', mean:62},
  {name:'Chania Boys High',           code:'CHANIA001', county:'Muranga', boarding:'boarding',gender:'boys',  mean:63},
  {name:'Mangu High School',          code:'MANGU0001', county:'Kiambu',  boarding:'boarding',gender:'boys',  mean:71},
  {name:'Starehe Boys Centre',        code:'STAREE001', county:'Nairobi', boarding:'boarding',gender:'boys',  mean:73},
  {name:'Asumbi Girls High',          code:'ASUMBI001', county:'HomaBay', boarding:'boarding',gender:'girls', mean:62},
  {name:'Sunshine Secondary',         code:'SUNSHN001', county:'Nairobi', boarding:'day',     gender:'mixed', mean:58},
  {name:'Nakuru High School',         code:'NAKURU001', county:'Nakuru',  boarding:'mixed',   gender:'boys',  mean:63},
  {name:'Nyambaria High School',      code:'NYAMBR001', county:'Nyamira', boarding:'boarding',gender:'boys',  mean:60},
  {name:'Friends Kamusinga',          code:'KAMUS0001', county:'Bungoma', boarding:'boarding',gender:'boys',  mean:62},
  {name:'Loreto Limuru',              code:'LORETO001', county:'Kiambu',  boarding:'boarding',gender:'girls', mean:67},
  {name:'Kakamega School',            code:'KAKAMG001', county:'Kakamega',boarding:'boarding',gender:'boys',  mean:64},
  {name:'Bishop Gatimu Girls',        code:'BGNGND001', county:'Nyeri',   boarding:'boarding',gender:'girls', mean:63},
  {name:'Kagumo High School',         code:'KAGUMO001', county:'Nyeri',   boarding:'boarding',gender:'boys',  mean:65},
  {name:'Kisii School',               code:'KISII0001', county:'Kisii',   boarding:'boarding',gender:'boys',  mean:64},
  {name:'Buruburu Girls',             code:'BURUBR001', county:'Nairobi', boarding:'day',     gender:'girls', mean:61},
  {name:'Dagoretti High School',      code:'DAGOR0001', county:'Nairobi', boarding:'mixed',   gender:'mixed', mean:59},
  {name:'Menengai High School',       code:'MENENG001', county:'Nakuru',  boarding:'boarding',gender:'mixed', mean:61},
  {name:'Agoro Sare High',            code:'AGORO0001', county:'HomaBay', boarding:'boarding',gender:'boys',  mean:59},
];

// Per-school first names (region-specific)
const FIRST_NAMES_BOYS = {
  Kiambu:   ['James','David','Peter','Samuel','Daniel','Joseph','Emmanuel','Benjamin','Moses','Aaron','Jonathan','Abraham','Isaac','Jacob','Caleb','Joshua','Elijah','Nathan','Solomon','Timothy','Mwangi','Kamau','Mugo','Gitahi','Karanja','Njoroge','Gichuki','Kimani','Njogu','Kariuki'],
  Nakuru:   ['Brian','Kevin','Dennis','Collins','Kelvin','Derrick','Geoffrey','Patrick','Francis','Raymond','Clinton','Kenneth','Boniface','Cyrus','Baraka','Samson','Gideon','Ezra','Nehemiah','Laban','Kipchoge','Koech','Rotich','Sang','Rono','Bett','Kiptoo','Cheruiyot','Langat','Kipkemoi'],
  Siaya:    ['Otieno','Odhiambo','Omondi','Owino','Okello','Odongo','Okoth','Oduya','Ogola','Onyango','Obiero','Opondo','Ochieng','Obondo','Oluoch','Omolo','Opiyo','Ondiek','Okwach','Olima','Ouma','Owuor','Olando','Ogutu','Ooko','Ochola','Odipo','Auma','Obiero','Okumu'],
  Nandi:    ['Edwin','Kipkoech','Kiprotich','Kiptanui','Kiprop','Kipkemoi','Kiplimo','Kibet','Kirui','Sigei','Rotich','Chepkwony','Korir','Serem','Ngetich','Yegon','Tanui','Mutai','Meli','Cheruiyot','Kipngetich','Kiplagat','Koskei','Ngeno','Siele','Too','Birech','Biwott','Chesang','Choge'],
  Kisumu:   ['Leon','Chris','Mark','Luke','Simon','Andrew','Philip','Thomas','Matthew','Jude','Barnabas','Apollos','Silas','Titus','Philemon','Epaphras','Archippus','Demas','Zenas','Gaius','Ouma','Otieno','Owino','Ochieng','Ondiek','Opondo','Odipo','Obiero','Okello','Oluoch'],
  Muranga:  ['Munene','Mureithi','Muriuki','Murimi','Muriki','Muturi','Munyi','Munyua','Muigai','Mwai','Mwangi','Mwariri','Mwenda','Mwoki','Mwololo','Mworia','Mwosi','Mwota','Mwau','Mwau','Kamau','Njoroge','Gitahi','Mugo','Karanja','Gichuki','Kimani','Njogu','Waweru','Kariuki'],
  Nyamira:  ['Morara','Moseti','Mokaya','Monari','Moturi','Mochama','Moindi','Motanya','Mogire','Mose','Moranga','Mobu','Mogio','Mobisa','Mogaka','Mogeni','Momanyi','Mogambi','Monsongo','Omache','Omari','Nyamweya','Bosire','Ongeri','Makori','Morae','Nyambok','Bichanga','Nyakundi','Nyamache'],
  Bungoma:  ['Wafula','Wekesa','Simiyu','Masinde','Mukhwana','Shiundu','Namasake','Barasa','Wanyama','Wabwire','Mugisha','Wasike','Wanyonyi','Wandabwa','Muliro','Luvai','Makokha','Khaoya','Nakhanu','Wamukota','Wandera','Wanjala','Waweru','Were','Wesonga','Wetende','Wichenje','Wokabi','Wolukau','Wopindi'],
  Kakamega: ['Innocent','Honest','Righteous','Faithful','Gracious','Merciful','Peaceful','Joyful','Patient','Kind','Humble','Meek','Gentle','Diligent','Prudent','Noble','Valiant','Bold','Brave','Worthy','Ouma','Otieno','Owino','Ochieng','Ondiek','Opondo','Odipo','Obiero','Okello','Oluoch'],
  Nyeri:    ['Newton','Darwin','Pascal','Faraday','Maxwell','Boyle','Kelvin','Joule','Watt','Ampere','Ohm','Hertz','Edison','Tesla','Marconi','Bell','Morse','Fleming','Baird','Curie','Njoroge','Mwangi','Kamau','Gitahi','Mugo','Karanja','Kimani','Gichuki','Njogu','Waweru'],
  Kisii:    ['Omari','Morara','Moseti','Mokaya','Monari','Moturi','Mochama','Moindi','Motanya','Mogire','Moranga','Mobu','Mogio','Mobisa','Mogaka','Mogeni','Momanyi','Mogambi','Monsongo','Omache','Nyamweya','Bosire','Momanyi','Mogaka','Ongeri','Makori','Morae','Nyambok','Bichanga','Omari'],
  HomaBay:  ['Otieno','Odhiambo','Ogweno','Owiti','Okeyo','Owuor','Olando','Ogutu','Ooko','Ochola','Ouma','Onyango','Ochieng','Odipo','Okello','Omondi','Owino','Opondo','Ondiek','Obiero','Zachary','Zebedee','Zuberi','Zephyr','Zavier','Zeb','Zeke','Zenith','Zeno','Zerah'],
  Nairobi:  ['Felix','Oscar','Arnold','Eugene','Clifford','Reginald','Sebastian','Nathaniel','Cornelius','Leopold','Algernon','Clarence','Martin','George','Henry','Edward','William','Richard','Charles','Frederick','Kamau','Otieno','Koech','Mwangi','Ochieng','Njoroge','Sang','Owino','Kimani','Karanja'],
  Mombasa:  ['Ahmad','Ali','Ameen','Amir','Anas','Aqeel','Arif','Asim','Ayub','Aziz','Bilal','Faisal','Faraz','Farhan','Hamza','Haris','Hassan','Hussain','Imran','Ibrahim','Karim','Reza','Tariq','Cyrus','Rohaan','Rajiv','Vikram','Arjun','Sanjay','Rahul'],
};
const FIRST_NAMES_GIRLS = {
  Kiambu:   ['Wanjiku','Wangari','Wairimu','Wambui','Wanjira','Wanjeri','Wanja','Wangeci','Wangui','Wanjiru','Wangechi','Waruguru','Wayua','Wendo','Winnie','Winifred','Waweru','Wakio','Njeri','Nyambura'],
  Nairobi:  ['Grace','Faith','Hope','Joy','Peace','Mercy','Patience','Charity','Prudence','Constance','Diligence','Fortitude','Wisdom','Beauty','Favour','Blessing','Promise','Victory','Gloria','Brenda'],
  HomaBay:  ['Adhiambo','Akinyi','Anyango','Awino','Atieno','Ajwang','Auma','Awuor','Aketch','Aduda','Akumu','Apiyo','Awiti','Abiero','Akelo','Alando','Alero','Aluoch','Amuge','Andega'],
  Thika:    ['Angela','Beatrice','Catherine','Dorothy','Eleanor','Florence','Gertrude','Helen','Irene','Josephine','Katherine','Lillian','Margaret','Natalie','Olivia','Pamela','Rose','Stella','Teresa','Ursula'],
  Muranga:  ['Nyambura','Njeri','Njoki','Nyawira','Nyaguthii','Nyakinya','Nyakio','Nyagundi','Nyagitari','Nyakinyua','Nyakundi','Nyamache','Nyamari','Nyambeki','Nyambu','Nyamoita','Nyamora','Nyamoyo','Nyamuta','Nyamwera'],
  Nyeri:    ['Immaculata','Concepcion','Annunciata','Consolation','Dolores','Remedios','Socorro','Pilar','Milagros','Salud','Paz','Esperanza','Caridad','Libertad','Natividad','Asuncion','Resurreccion','Encarnacion','Trinidad','Milagros'],
  Mombasa:  ['Amina','Fatuma','Zainab','Khadija','Maryam','Aisha','Halima','Safia','Rahma','Nimo','Fardosa','Ifrah','Sagal','Hodan','Deko','Faadumo','Anab','Sulekha','Caasha','Nadia'],
};
const LAST_NAMES = {
  Kiambu:   ['Kamau','Mwangi','Njoroge','Gitahi','Mugo','Karanja','Gichuki','Kimani','Njogu','Waweru','Kariuki','Kinyua','Mureithi','Macharia','Mwaniki','Njenga','Kamundi','Murugi','Mwatha','Muriuki'],
  Nakuru:   ['Koech','Sang','Rono','Bett','Kiptoo','Cheruiyot','Langat','Kipchoge','Kipkemoi','Mutai','Rotich','Sigei','Yegon','Tanui','Ngetich','Serem','Kirui','Kibet','Chepkwony','Korir'],
  Nairobi:  ['Kamau','Otieno','Koech','Mwangi','Ochieng','Njoroge','Sang','Owino','Kimani','Karanja','Shah','Patel','Khan','Wanjiku','Wambui','Achieng','Akinyi','Njogu','Kariuki','Gitahi'],
  Siaya:    ['Otieno','Odhiambo','Ogweno','Owiti','Okeyo','Owuor','Olando','Ogutu','Ooko','Ochola','Ouma','Onyango','Okello','Omondi','Opondo','Ondiek','Obiero','Odipo','Okoth','Oduya'],
  Kisumu:   ['Ouma','Otieno','Owino','Ochieng','Ondiek','Opondo','Odipo','Obiero','Okello','Oluoch','Odongo','Okoth','Oduya','Ogola','Onyango','Obiero','Omolo','Opiyo','Okwach','Olima'],
  Nandi:    ['Rono','Sang','Koech','Kiptoo','Kipchoge','Bett','Cheruiyot','Langat','Ngetich','Yegon','Rotich','Sigei','Tanui','Mutai','Kirui','Kibet','Chepkwony','Korir','Serem','Kiplagat'],
  Muranga:  ['Kamau','Njoroge','Mwangi','Gitahi','Mugo','Karanja','Gichuki','Kimani','Njogu','Waweru','Kariuki','Kinyua','Mureithi','Macharia','Mwaniki','Njenga','Kamundi','Murugi','Mwatha','Muriuki'],
  Nyamira:  ['Nyamweya','Bosire','Momanyi','Mogaka','Ongeri','Makori','Morae','Nyambok','Bichanga','Omari','Nyakundi','Nyamache','Nyamoita','Nyamoyo','Nyamuta','Nyamwera','Nyaboke','Nyanchoka','Nyarangi','Nyaribo'],
  Bungoma:  ['Wafula','Simiyu','Wekesa','Barasa','Wanyama','Masinde','Makokha','Muliro','Luvai','Khaoya','Wanyonyi','Wandabwa','Namasake','Shiundu','Mukhwana','Wabwire','Mugisha','Wasike','Wandera','Wanjala'],
  Kakamega: ['Otieno','Ochieng','Owino','Odongo','Okello','Omondi','Opondo','Ondiek','Obiero','Oluoch','Wafula','Simiyu','Barasa','Masinde','Makokha','Muliro','Luvai','Khaoya','Wanyonyi','Wandabwa'],
  Nyeri:    ['Njoroge','Mwangi','Kamau','Gitahi','Mugo','Karanja','Kimani','Gichuki','Njogu','Waweru','Kariuki','Kinyua','Mureithi','Macharia','Mwaniki','Njenga','Kamundi','Murugi','Mwatha','Muriuki'],
  Kisii:    ['Nyamweya','Bosire','Momanyi','Mogaka','Ongeri','Makori','Morae','Nyambok','Bichanga','Omari','Nyakundi','Nyamache','Nyamoita','Nyamoyo','Nyamuta','Nyamwera','Nyaboke','Nyanchoka','Nyarangi','Nyaribo'],
  HomaBay:  ['Otieno','Odhiambo','Ogweno','Owiti','Okeyo','Owuor','Olando','Ogutu','Ooko','Ochola','Ouma','Onyango','Ochieng','Odipo','Okello','Omondi','Owino','Opondo','Ondiek','Obiero'],
  Thika:    ['Wanjiku','Muthoni','Njoki','Wairimu','Wambui','Njeri','Nyambura','Wangare','Gathoni','Wanjiru','Kamau','Njoroge','Mwangi','Gitahi','Mugo','Karanja','Gichuki','Kimani','Njogu','Waweru'],
  Mombasa:  ['Mohamed','Hassan','Ahmed','Ibrahim','Osman','Farouk','Juma','Salim','Bakari','Omar','Rashid','Khalid','Saidi','Mwamba','Charo','Kazungu','Kenga','Ngumbao','Karisa','Chai'],
};

const SUBJECTS = [
  {name:'English',     code:'ENG',category:'core',    compulsory:true},
  {name:'Kiswahili',   code:'KSW',category:'core',    compulsory:true},
  {name:'Mathematics', code:'MAT',category:'core',    compulsory:true},
  {name:'Biology',     code:'BIO',category:'science', compulsory:true},
  {name:'Chemistry',   code:'CHE',category:'science', compulsory:true},
  {name:'Physics',     code:'PHY',category:'science', compulsory:false},
  {name:'History',     code:'HIS',category:'humanities',compulsory:false},
  {name:'Geography',   code:'GEO',category:'humanities',compulsory:false},
  {name:'CRE',         code:'CRE',category:'humanities',compulsory:false},
  {name:'Agriculture', code:'AGR',category:'applied', compulsory:false},
  {name:'Computer Studies',code:'CST',category:'applied',compulsory:false},
  {name:'Business Studies',code:'BST',category:'applied',compulsory:false},
];

const EXAM_SERIES = [
  {name:'Term 1 Opening Test 2024',  type:'opener',   start:'2024-01-15',end:'2024-01-19'},
  {name:'Term 1 Mid-Term Exam 2024', type:'mid_term', start:'2024-02-19',end:'2024-02-23'},
  {name:'Term 1 End Term Exam 2024', type:'end_term', start:'2024-03-25',end:'2024-03-29'},
  {name:'Term 2 Opening Test 2024',  type:'opener',   start:'2024-05-06',end:'2024-05-10'},
  {name:'Term 2 Mid-Term Exam 2024', type:'mid_term', start:'2024-06-17',end:'2024-06-21'},
  {name:'Term 2 End Term Exam 2024', type:'end_term', start:'2024-07-22',end:'2024-07-26'},
  {name:'Term 3 Mock Examination',   type:'mock',     start:'2024-10-07',end:'2024-10-18'},
  {name:'KCSE Trial Exam 2024',      type:'kcse',     start:'2024-10-28',end:'2024-11-08'},
];

const CLUBS = [
  {name:'Debate Club',    code:'DEB',category:'academic',  day:'Monday',    time:'15:30',venue:'Assembly Hall'},
  {name:'Drama Club',     code:'DRA',category:'arts',      day:'Tuesday',   time:'15:30',venue:'School Hall'},
  {name:'Science Club',   code:'SCI',category:'academic',  day:'Wednesday', time:'15:30',venue:'Lab 1'},
  {name:'Football Club',  code:'FBL',category:'sports',    day:'Wednesday', time:'16:00',venue:'Pitch'},
  {name:'Rugby Club',     code:'RUG',category:'sports',    day:'Thursday',  time:'16:00',venue:'Field'},
  {name:'Music Club',     code:'MUS',category:'arts',      day:'Thursday',  time:'15:30',venue:'Music Room'},
  {name:'Wildlife Club',  code:'WLD',category:'community', day:'Friday',    time:'15:30',venue:'Classroom 5'},
  {name:'Red Cross',      code:'RCR',category:'community', day:'Friday',    time:'15:30',venue:'Hall'},
];

function getFirstNames(school, gender) {
  const county = school.county.replace(/[' ]/g,'');
  const g = gender === 'male' ? FIRST_NAMES_BOYS : FIRST_NAMES_GIRLS;
  return g[county] || g[school.county] || FIRST_NAMES_BOYS.Nairobi;
}
function getLastNames(school) {
  const county = school.county.replace(/[' ]/g,'');
  return LAST_NAMES[county] || LAST_NAMES[school.county] || LAST_NAMES.Nairobi;
}

async function seed() {
  const logger = { info: console.log, warn: console.warn, error: console.error };
  logger.info('🌱 ElimuSaaS Complete Seed v3 starting...\n');

  const pwdHash  = await bcrypt.hash('School@2024!', 10);
  const superPwd = await bcrypt.hash('SuperAdmin@2025!', 10);

  // Super admin
  await q(`INSERT INTO users(id,email,password_hash,role,first_name,last_name,is_active,is_email_verified)
           VALUES($1,$2,$3,'super_admin','Super','Admin',true,true)
           ON CONFLICT(email) DO UPDATE SET password_hash=$3, role='super_admin'`,
    [uuid(),'superadmin@elimusaas.com',superPwd]);

  for (const school of SCHOOLS) {
    try {
      logger.info(`\n🏫 ${school.name}...`);
      const schoolId = uuid();
      const adminEmail = `admin@${school.code.toLowerCase()}.ke`;

      // ── Admin user ───────────────────────────────────────
      const {rows:[admin]} = await q(`
        INSERT INTO users(id,email,password_hash,role,first_name,last_name,phone,is_active,is_email_verified)
        VALUES($1,$2,$3,'school_admin','School','Admin',$4,true,true)
        ON CONFLICT(email) DO UPDATE SET password_hash=$3 RETURNING id`,
        [uuid(),adminEmail,pwdHash,`+2547${randInt(10,99)}${randInt(100000,999999)}`]);
      const adminId = admin.id;

      // ── School ───────────────────────────────────────────
      const {rows:[sc]} = await q(`
        INSERT INTO schools(id,school_code,name,short_name,type,boarding_type,county,
          email,phone,address,motto,founded_year,is_active,is_verified)
        VALUES($1,$2,$3,$4,'secondary',$5,$6,$7,$8,$9,$10,$11,true,true)
        ON CONFLICT(school_code) DO UPDATE SET name=$3,is_active=true
        RETURNING id`,
        [schoolId,school.code,school.name,school.code.slice(0,6),school.boarding,school.county,
         adminEmail,`+254${randInt(100000000,799999999)}`,
         `P.O. Box ${randInt(1,9999)}-${randInt(10000,99999)}, ${school.county}`,
         'Excellence in Education',randInt(1950,2000)]);
      const SID = sc.id;
      await q(`UPDATE users SET school_id=$1 WHERE id=$2`,[SID,adminId]);

      // ── Academic year ─────────────────────────────────────
      const ayId = uuid();
      await q(`INSERT INTO academic_years(id,school_id,year,label,start_date,end_date,is_current)
               VALUES($1,$2,2024,'2024 Academic Year','2024-01-08','2024-11-15',true)
               ON CONFLICT(school_id,year) DO UPDATE SET is_current=true`,[ayId,SID]);
      const {rows:[ay]} = await q(`SELECT id FROM academic_years WHERE school_id=$1 AND year=2024`,[SID]);
      const AY = ay.id;

      // ── Terms config ──────────────────────────────────────
      const terms = [
        {term:'term_1',label:'Term 1 2024',start:'2024-01-08',end:'2024-03-29',current:false},
        {term:'term_2',label:'Term 2 2024',start:'2024-05-06',end:'2024-07-26',current:false},
        {term:'term_3',label:'Term 3 2024',start:'2024-09-02',end:'2024-11-15',current:true},
      ];
      const termIds = {};
      for (const t of terms) {
        const tid = uuid();
        const {rows:[tr]} = await q(`
          INSERT INTO terms_config(id,school_id,academic_year_id,term,label,start_date,end_date,is_current)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT(school_id,academic_year_id,term) DO UPDATE SET label=$5
          RETURNING id`,[tid,SID,AY,t.term,t.label,t.start,t.end,t.current]);
        termIds[t.term] = tr.id;
      }

      // ── Grading scale ─────────────────────────────────────
      await q(`INSERT INTO grading_scales(id,school_id,name,is_default,grades)
               VALUES($1,$2,'KCSE Grading Scale',true,$3) ON CONFLICT DO NOTHING`,
        [uuid(),SID,JSON.stringify([
          {grade:'A',min:75,max:100,points:12},{grade:'A-',min:70,max:74,points:11},
          {grade:'B+',min:65,max:69,points:10},{grade:'B',min:60,max:64,points:9},
          {grade:'B-',min:55,max:59,points:8},{grade:'C+',min:50,max:54,points:7},
          {grade:'C',min:45,max:49,points:6},{grade:'C-',min:40,max:44,points:5},
          {grade:'D+',min:35,max:39,points:4},{grade:'D',min:30,max:34,points:3},
          {grade:'D-',min:25,max:29,points:2},{grade:'E',min:0,max:24,points:1},
        ])]);

      // ── Subscription ──────────────────────────────────────
      const subId = uuid();
      const plans = ['flat_small','flat_medium','flat_medium','flat_large','per_student'];
      const plan  = rand(plans);
      const prices= {flat_small:5000,flat_medium:8500,flat_large:15000,per_student:35};
      const stCount = randInt(300,800);
      const total = plan==='per_student' ? stCount*prices.per_student : prices[plan];
      await q(`
        INSERT INTO subscriptions(id,school_id,plan,status,term,year,student_count,
          base_price,total_amount,amount_paid,start_date,end_date,next_billing_date,created_by)
        VALUES($1,$2,$3,'active','term_1',2024,$4,$5,$6,$6,'2024-01-08','2024-12-31','2025-01-08',$7)
        ON CONFLICT DO NOTHING`,
        [subId,SID,plan,stCount,prices[plan]||8500,total,adminId]);

      await q(`
        INSERT INTO subscription_payments(id,subscription_id,school_id,amount,payment_method,
          status,reference,paid_at)
        VALUES($1,$2,$3,$4,'mpesa_paybill','completed',$5,NOW()-INTERVAL '30 days')
        ON CONFLICT DO NOTHING`,
        [uuid(),subId,SID,total,`MPESA${randInt(1000000,9999999)}`]);

      // ── Subjects ──────────────────────────────────────────
      const subjectMap = {};
      for (const sub of SUBJECTS) {
        const {rows:[sr]} = await q(`
          INSERT INTO subjects(id,school_id,name,code,category,is_compulsory)
          VALUES($1,$2,$3,$4,$5,$6)
          ON CONFLICT(school_id,code) DO UPDATE SET name=$3
          RETURNING id`,[uuid(),SID,sub.name,sub.code,sub.category,sub.compulsory]);
        subjectMap[sub.code] = sr.id;
      }

      // ── Teachers (20) ─────────────────────────────────────
      const tFirstM = ['James','Peter','David','John','Paul','Moses','Joseph','Daniel','Samuel','Aaron',
                       'Jonathan','Caleb','Joshua','Elijah','Nathan','Solomon','Timothy','Stephen','Andrew','Philip'];
      const tFirstF = ['Mary','Grace','Faith','Hope','Joy','Mercy','Peace','Patience','Charity','Prudence',
                       'Wanjiku','Wairimu','Wambui','Njeri','Nyambura','Wangare','Gathoni','Muthoni','Njoki','Wanjiru'];
      const tLast   = getLastNames(school);

      const teacherIds = [];
      for (let i=0;i<20;i++) {
        const isF = i >= 10;
        const fn  = isF ? tFirstF[i-10] : tFirstM[i];
        const ln  = tLast[i % tLast.length];
        const role= i===0?'deputy_principal':i===1?'dean_of_studies':i===2?'hod':
                    i===3?'bursar':i===4?'librarian':'teacher';
        const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${school.code.toLowerCase()}@elimusaas.ke`;
        const {rows:[tu]} = await q(`
          INSERT INTO users(id,school_id,email,password_hash,role,first_name,last_name,
            gender,phone,is_active,is_email_verified)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,true)
          ON CONFLICT(email) DO UPDATE SET school_id=$2 RETURNING id`,
          [uuid(),SID,email,pwdHash,role,fn,ln,isF?'female':'male',
           `+254${randInt(100000000,799999999)}`]);
        const tid = tu.id;
        const desigs = ['Deputy Principal','Dean of Studies','Head of Department','Bursar',
                        'Librarian','Teacher','Senior Teacher','Class Teacher','Form Master','Subject Teacher'];
        const depts  = ['Administration','Academics','Mathematics','Sciences','English',
                        'Kiswahili','Humanities','Technical','Arts','Finance'];
        await q(`
          INSERT INTO staff(id,school_id,user_id,staff_number,tsc_number,designation,
            department,employment_type,employment_date,qualification,is_hod,is_active)
          VALUES($1,$2,$3,$4,$5,$6,$7,'permanent',$8,$9,$10,true) ON CONFLICT DO NOTHING`,
          [uuid(),SID,tid,
           `${school.code.slice(0,4)}/T/${String(i+1).padStart(3,'0')}`,
           `TSC/${randInt(100000,999999)}`,desigs[i]||'Teacher',
           depts[i]||'General',
           new Date(2024-randInt(1,15),randInt(0,11),1).toISOString().split('T')[0],
           ['PhD','Masters','Bachelor\'s Degree','Diploma','Bachelor\'s Degree'][i%5],
           i<3]);
        if (role==='teacher'||role==='hod'||role==='dean_of_studies'||role==='deputy_principal') {
          teacherIds.push(tid);
        }
      }
      // ensure at least 15 teachers
      while (teacherIds.length < 15) teacherIds.push(teacherIds[teacherIds.length-1]);

      // ── Classes (Form 1-4 x 3 streams) ───────────────────
      const streams = ['A','B','C'];
      const classMap = {};
      for (let form=1;form<=4;form++) {
        for (const s of streams) {
          const {rows:[cr]} = await q(`
            INSERT INTO classes(id,school_id,name,level,stream,class_teacher_id,capacity,is_active)
            VALUES($1,$2,$3,$4,$5,$6,45,true)
            ON CONFLICT(school_id,level,stream) DO UPDATE SET name=$3 RETURNING id`,
            [uuid(),SID,`Form ${form}`,form,s,teacherIds[(form-1)*3+streams.indexOf(s)]]);
          classMap[`${form}${s}`] = cr.id;
        }
      }

      // ── Assign subjects to classes ────────────────────────
      const subCodes = Object.keys(subjectMap);
      for (let form=1;form<=4;form++) {
        for (const s of streams) {
          const cid = classMap[`${form}${s}`];
          for (let i=0;i<subCodes.length;i++) {
            await q(`INSERT INTO class_subjects(id,school_id,class_id,subject_id,teacher_id,academic_year_id)
                     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
              [uuid(),SID,cid,subjectMap[subCodes[i]],teacherIds[i%teacherIds.length],AY]).catch(()=>{});
          }
        }
      }

      // ── Students (22-28 per stream) ───────────────────────
      logger.info(`   Adding students...`);
      const usedAdm = new Set(); const usedName = new Set();
      let seq = 1;
      const allStudents = [];

      for (let form=1;form<=4;form++) {
        for (const s of streams) {
          const cid = classMap[`${form}${s}`];
          const count = randInt(22,28);
          for (let i=0;i<count;i++) {
            const g = school.gender==='boys'?'male':school.gender==='girls'?'female':
                      (i%3===0?'female':'male');
            const firstPool = getFirstNames(school, g);
            const lastPool  = getLastNames(school);
            let fn,ln,nk,tries=0;
            do { fn=rand(firstPool); ln=rand(lastPool); nk=fn+ln; tries++; }
            while(usedName.has(nk)&&tries<40);
            usedName.add(nk);

            const yr = 2024-form+1;
            let admNo;
            do { admNo=`${school.code.slice(0,4)}${yr}${String(seq).padStart(4,'0')}`; seq++; }
            while(usedAdm.has(admNo));
            usedAdm.add(admNo);

            const dob = new Date(yr-14,randInt(0,11),randInt(1,28));
            const {rows:[st]} = await q(`
              INSERT INTO students(id,school_id,first_name,last_name,admission_number,
                gender,date_of_birth,current_class_id,admission_date,is_boarding,is_active,
                kcpe_index_number,blood_group,nationality,county)
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,'Kenyan',$13)
              ON CONFLICT(school_id,admission_number) DO NOTHING RETURNING id`,
              [uuid(),SID,fn,ln,admNo,g,dob.toISOString().split('T')[0],cid,
               `${yr}-01-15`,school.boarding==='boarding'||(school.boarding==='mixed'&&Math.random()>0.5),
               `${school.code.slice(0,3)}${yr}${randInt(10000,99999)}`,
               rand(['A+','A-','B+','B-','O+','O-','AB+','AB-']),school.county]).catch(()=>({rows:[]}));

            if (!st?.id) continue;
            allStudents.push({id:st.id, classId:cid, form});

            // Parent
            const pFn = rand(['Mr. James','Mrs. Mary','Dr. Peter','Prof. Grace','Eng. Paul']);
            await q(`INSERT INTO student_parents(id,student_id,relationship,first_name,last_name,
                     phone,email,is_primary,is_emergency_contact)
                     VALUES($1,$2,'parent',$3,$4,$5,$6,true,true) ON CONFLICT DO NOTHING`,
              [uuid(),st.id,pFn,ln,
               `+254${randInt(100000000,799999999)}`,
               `parent.${fn.toLowerCase()}.${ln.toLowerCase()}@gmail.com`]).catch(()=>{});

            // Student class history
            await q(`INSERT INTO student_class_history(id,student_id,class_id,academic_year_id,roll_number)
                     VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
              [uuid(),st.id,cid,AY,String(i+1).padStart(3,'0')]).catch(()=>{});
          }
        }
      }
      logger.info(`   ${allStudents.length} students added`);

      // ── Clubs ─────────────────────────────────────────────
      const clubIds = [];
      for (let ci=0;ci<CLUBS.length;ci++) {
        const cl = CLUBS[ci];
        const {rows:[clr]} = await q(`
          INSERT INTO clubs(id,school_id,name,code,category,description,meeting_day,
            meeting_time,meeting_venue,patron_id,is_active)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
          ON CONFLICT DO NOTHING RETURNING id`,
          [uuid(),SID,cl.name,`${school.code.slice(0,3)}-${cl.code}`,cl.category,
           `${cl.name} at ${school.name}`,cl.day,cl.time,cl.venue,
           teacherIds[ci%teacherIds.length]]);
        if (clr?.id) {
          clubIds.push(clr.id);
          // 10-20 members per club
          const members = pick(randInt(10,20), allStudents);
          const roles = ['member','chairperson','secretary','treasurer'];
          for (let mi=0;mi<members.length;mi++) {
            await q(`INSERT INTO club_memberships(id,club_id,student_id,school_id,role,joined_date,is_active)
                     VALUES($1,$2,$3,$4,$5,'2024-01-20',true) ON CONFLICT DO NOTHING`,
              [uuid(),clr.id,members[mi].id,SID,roles[mi<4?mi:0]]).catch(()=>{});
          }
          // Club events
          for (let ei=0;ei<3;ei++) {
            await q(`INSERT INTO club_events(id,club_id,school_id,name,description,event_date,
                     venue,result,created_by)
                     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
              [uuid(),clr.id,SID,
               `${cl.name} ${['Inter-House','Inter-School','Annual'][ei]} Event`,
               `Annual ${cl.name} competition`,
               new Date(2024,randInt(1,9),randInt(1,28)).toISOString().split('T')[0],
               cl.venue,`${school.name} ${rand(['Won','Participated','Runners-up','Champions'])}`,
               adminId]).catch(()=>{});
          }
        }
      }

      // ── Attendance (last 30 school days) ─────────────────
      logger.info(`   Adding attendance...`);
      const sampleStudents = allStudents.slice(0,Math.min(50,allStudents.length));
      for (let d=1;d<=30;d++) {
        const date = new Date(2024,8,d); // September 2024
        if (date.getDay()===0||date.getDay()===6) continue;
        const dateStr = date.toISOString().split('T')[0];
        for (const st of sampleStudents.slice(0,30)) {
          const status = Math.random()<0.92?'present':Math.random()<0.5?'absent':'late';
          await q(`INSERT INTO attendance_records(id,school_id,student_id,class_id,date,status,marked_by)
                   VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
            [uuid(),SID,st.id,st.classId,dateStr,status,teacherIds[0]]).catch(()=>{});
        }
      }

      // ── Fee structure + items + assignments + payments ────
      logger.info(`   Adding fees...`);
      const fsId = uuid();
      await q(`INSERT INTO fee_structures(id,school_id,academic_year_id,name,applies_to_all_classes,is_active,created_by)
               VALUES($1,$2,$3,'2024 Annual Fees',true,true,$4) ON CONFLICT DO NOTHING`,
        [fsId,SID,AY,adminId]);
      await q(`SELECT id FROM fee_structures WHERE school_id=$1 LIMIT 1`,[SID]).then(({rows})=>{});

      const feeItems = school.boarding==='boarding' ?
        [{cat:'tuition',name:'Tuition Fee',amt:18000},{cat:'boarding',name:'Boarding',amt:12000},{cat:'exams',name:'Exam Fee',amt:2000},{cat:'activity',name:'Activity',amt:1500},{cat:'uniform',name:'Uniform',amt:2500}] :
        [{cat:'tuition',name:'Tuition Fee',amt:18000},{cat:'exams',name:'Exam Fee',amt:2000},{cat:'activity',name:'Activity Fee',amt:1500},{cat:'book',name:'Books & Stationery',amt:3000}];
      const totalFee = feeItems.reduce((s,i)=>s+i.amt,0);

      for (let fi=0;fi<feeItems.length;fi++) {
        await q(`INSERT INTO fee_items(id,fee_structure_id,school_id,category,name,amount,is_mandatory,sort_order)
                 VALUES($1,$2,$3,$4,$5,$6,true,$7) ON CONFLICT DO NOTHING`,
          [uuid(),fsId,SID,feeItems[fi].cat,feeItems[fi].name,feeItems[fi].amt,fi]).catch(()=>{});
      }

      // Fee assignments + payments for all students
      const methods = ['cash','mpesa_stk','bank_transfer','mpesa_paybill'];
      for (const st of allStudents) {
        await q(`INSERT INTO student_fee_assignments(id,student_id,fee_structure_id,school_id,academic_year_id,
                 total_fees,discount_amount,net_fees)
                 VALUES($1,$2,$3,$4,$5,$6,0,$6) ON CONFLICT DO NOTHING`,
          [uuid(),st.id,fsId,SID,AY,totalFee]).catch(()=>{});

        if (Math.random()<0.78) {
          const pct = Math.random()>0.4 ? 1 : randFloat(0.3,0.9);
          const amt = Math.round(totalFee*pct);
          const method = rand(methods);
          await q(`INSERT INTO fee_payments(id,school_id,student_id,fee_structure_id,academic_year_id,
                   receipt_number,amount,payment_method,payment_date,status,created_by,
                   ${method==='mpesa_stk'||method==='mpesa_paybill'?'mpesa_receipt,mpesa_phone,':''}
                   notes)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'completed',$10
                   ${method==='mpesa_stk'||method==='mpesa_paybill'?`,'QHJ${randInt(1000000,9999999)}','+254${randInt(700000000,799999999)}'`:''}
                   ,$11) ON CONFLICT(school_id,receipt_number) DO NOTHING`,
            [uuid(),SID,st.id,fsId,AY,
             `RCP-${school.code}-${Date.now()}-${randInt(100,999)}`,
             amt,method,
             new Date(2024,randInt(0,9),randInt(1,28)).toISOString().split('T')[0],
             adminId,'Fee payment for 2024']).catch(()=>{});
        }
      }

      // ── Exam series + papers + marks ──────────────────────
      logger.info(`   Adding exams and marks...`);
      const byClass = {};
      allStudents.forEach(st => {
        if(!byClass[st.classId]) byClass[st.classId]=[];
        byClass[st.classId].push(st.id);
      });

      for (let ei=0;ei<EXAM_SERIES.length;ei++) {
        const es = EXAM_SERIES[ei];
        const locked = ei < 6;
        const esId = uuid();
        await q(`INSERT INTO exam_series(id,school_id,academic_year_id,name,type,classes,
                 start_date,end_date,is_locked,created_by)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
          [esId,SID,AY,es.name,es.type,
           `{${Object.values(classMap).join(',')}}`,
           es.start,es.end,locked,adminId]).catch(()=>{});

        if (!locked) continue; // only mark completed series

        for (let form=1;form<=4;form++) {
          for (const s of streams) {
            const cid = classMap[`${form}${s}`];
            const studs = byClass[cid]||[];
            if (!studs.length) continue;

            for (let si=0;si<subCodes.length;si++) {
              const subId = subjectMap[subCodes[si]];
              const tid   = teacherIds[si%teacherIds.length];
              const paperId = uuid();
              await q(`INSERT INTO exam_papers(id,exam_series_id,school_id,class_id,subject_id,
                       teacher_id,max_marks,is_submitted,submitted_at,hod_approved)
                       VALUES($1,$2,$3,$4,$5,$6,100,true,NOW(),true)
                       ON CONFLICT(exam_series_id,class_id,subject_id) DO UPDATE SET is_submitted=true
                       RETURNING id`,[paperId,esId,SID,cid,subId,tid]).catch(()=>({rows:[{id:paperId}]}));

              for (const stId of studs) {
                const m = Math.min(100,Math.max(15,Math.round(
                  school.mean + (Math.random()-0.5)*34 + (4-form)*2
                )));
                const {g,pts} = gradeFromMarks(m);
                await q(`INSERT INTO student_marks(id,exam_paper_id,student_id,school_id,marks,grade,points,is_absent)
                         VALUES($1,$2,$3,$4,$5,$6,$7,false)
                         ON CONFLICT(exam_paper_id,student_id) DO NOTHING`,
                  [uuid(),paperId,stId,SID,m,g,pts]).catch(()=>{});
              }
            }
          }
        }
      }

      // ── Certificates ─────────────────────────────────────
      const certTypes = ['academic','sports','arts','leadership','participation'];
      const certStudents = pick(Math.min(15,allStudents.length), allStudents);
      for (let ci=0;ci<certStudents.length;ci++) {
        const st = certStudents[ci];
        const type = certTypes[ci%certTypes.length];
        const titles = {academic:'Academic Excellence Award',sports:'Sports Championship',
                        arts:'Arts & Culture Award',leadership:'Leadership Award',participation:'Certificate of Participation'};
        await q(`INSERT INTO certificates(id,school_id,student_id,recipient_name,type,title,
                 description,issued_date,issued_by,certificate_number)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
          [uuid(),SID,st.id,`Student ${ci+1}`,type,titles[type],
           `Awarded for outstanding performance in ${type}`,
           new Date(2024,randInt(2,10),randInt(1,28)).toISOString().split('T')[0],
           adminId,`CERT-${school.code}-2024-${String(ci+1).padStart(4,'0')}`]).catch(()=>{});
      }

      // ── Leave requests ────────────────────────────────────
      const leaveStudents = pick(Math.min(8,allStudents.length), allStudents);
      for (const st of leaveStudents) {
        const dep = new Date(2024,8,randInt(5,25),randInt(14,16),0);
        const ret = new Date(2024,8,dep.getDate()+randInt(1,3),18,0);
        await q(`INSERT INTO leave_requests(id,school_id,student_id,destination,reason,
                 departure_datetime,expected_return_datetime,status,class_teacher_id,
                 class_teacher_approved_at,escort_relationship,escort_phone)
                 VALUES($1,$2,$3,$4,$5,$6,$7,'principal_approved',$8,NOW(),'Parent','+254712345678')
                 ON CONFLICT DO NOTHING`,
          [uuid(),SID,st.id,
           rand(['Nairobi','Nakuru','Kisumu','Mombasa','Thika']),'Medical appointment',
           dep.toISOString(),ret.toISOString(),teacherIds[0]]).catch(()=>{});
      }

      // ── Newsletters ───────────────────────────────────────
      const termNames = ['Term 1','Term 2','Term 3'];
      for (let ti=0;ti<3;ti++) {
        await q(`INSERT INTO newsletters(id,school_id,title,subtitle,content,academic_year_id,
                 term_id,is_published,published_at,views,created_by)
                 VALUES($1,$2,$3,$4,$5,$6,$7,true,NOW()-INTERVAL '${(3-ti)*30} days',$8,$9)
                 ON CONFLICT DO NOTHING`,
          [uuid(),SID,
           `${school.name} ${termNames[ti]} 2024 Newsletter`,
           `Updates from the ${school.name} Community`,
           `<h2>Principal's Message</h2><p>Dear Parents and Guardians, it is with great pleasure that we share with you the highlights of ${termNames[ti]} 2024. Our students have continued to excel both academically and in co-curricular activities. We recorded a mean grade improvement of ${randFloat(0.2,1.5)}% compared to last term.</p><h2>Academic Performance</h2><p>The ${termNames[ti]} examinations showed remarkable improvement across all forms. Form Four candidates are on track for excellent KCSE results.</p><h2>Sports & Clubs</h2><p>Our athletes represented the school at county level competitions. The debate team advanced to nationals.</p>`,
           AY,termIds[`term_${ti+1}`]||termIds.term_1,
           randInt(150,800),adminId]).catch(()=>{});
      }

      // ── Notifications ─────────────────────────────────────
      const notifTypes = ['fee_reminder','exam_results','attendance_alert','general'];
      for (let ni=0;ni<6;ni++) {
        await q(`INSERT INTO notifications(id,school_id,user_id,title,body,type,category,is_read)
                 VALUES($1,$2,$3,$4,$5,'in_app',$6,false)
                 ON CONFLICT DO NOTHING`,
          [uuid(),SID,adminId,
           ['Fee Reminder Sent','Exam Results Available','New Newsletter Published',
            'Term 3 Fee Structure Updated','Staff Meeting Tomorrow','Report Cards Ready'][ni],
           ['Fee reminders have been sent to all parents','Term 2 results are now available for viewing',
            'The Term 2 newsletter has been published','New fee structure is active',
            'Staff meeting scheduled for 2pm tomorrow','Report cards are ready for collection'][ni],
           notifTypes[ni%notifTypes.length]]).catch(()=>{});
      }

      // ── School ranking ────────────────────────────────────
      const gradeMap = {A:0,B:0,C:0,D:0,E:0};
      allStudents.slice(0,50).forEach(()=>{
        const m = Math.round(school.mean+(Math.random()-0.5)*20);
        const {g} = gradeFromMarks(m);
        gradeMap[g[0]] = (gradeMap[g[0]]||0)+1;
      });
      await q(`INSERT INTO school_rankings(id,school_id,academic_year,term,county,
               national_rank,county_rank,mean_grade,mean_points,total_candidates,
               a_plain,b_plain,c_plain,d_plain,e)
               VALUES($1,$2,2024,'term_2',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
               ON CONFLICT DO NOTHING`,
        [uuid(),SID,school.county,
         randInt(1,50),randInt(1,10),
         ['A','B+','B','B-','C+'][SCHOOLS.indexOf(school)%5],
         randFloat(7,11,1),randInt(200,450),
         gradeMap.A||0,gradeMap.B||0,gradeMap.C||0,gradeMap.D||0,gradeMap.E||0]).catch(()=>{});

      logger.info(`   ✅ ${school.name} complete (${allStudents.length} students)`);

    } catch(err) {
      logger.error(`   ❌ ${school.name} failed: ${err.message}`);
    }
  }

  logger.info('\n\n🎉 SEED COMPLETE!');
  logger.info('══════════════════════════════════════════════');
  logger.info('Super Admin:  superadmin@elimusaas.com  /  SuperAdmin@2025!');
  logger.info('School Admin: admin@alliance01.ke       /  School@2024!');
  logger.info('Teacher:      james.kamau.alliance01@elimusaas.ke  /  School@2024!');
  logger.info('══════════════════════════════════════════════');
}

module.exports = seed;
if (require.main === module) {
  seed().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
}
