// ============================================================
// ElimuSaaS — Demo Seed (Auto-runs if < 5 schools in DB)
// ============================================================
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const q = async (sql, p = []) => {
  try {
    const { getPool } = require('../config/database');
    return getPool().query(sql, p);
  } catch(e) {
    const { Pool } = require('pg');
    require('dotenv').config();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    return pool.query(sql, p);
  }
};

const rand  = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (a,b) => Math.floor(Math.random()*(b-a+1))+a;

function grade(m) {
  if (m>=75)return{g:'A',p:12};if(m>=70)return{g:'A-',p:11};if(m>=65)return{g:'B+',p:10};
  if(m>=60)return{g:'B',p:9};if(m>=55)return{g:'B-',p:8};if(m>=50)return{g:'C+',p:7};
  if(m>=45)return{g:'C',p:6};if(m>=40)return{g:'C-',p:5};if(m>=35)return{g:'D+',p:4};
  if(m>=30)return{g:'D',p:3};if(m>=25)return{g:'D-',p:2};return{g:'E',p:1};
}

const SCHOOLS = [
  {name:'Alliance High School',         code:'ALLIANCE01',county:'Kiambu',  boarding:'boarding',gender:'boys'},
  {name:'Moi High School Kabarak',       code:'KABARAK001', county:'Nakuru',  boarding:'boarding',gender:'boys'},
  {name:'Kenya High School',             code:'KENYAHIGH1', county:'Nairobi', boarding:'boarding',gender:'girls'},
  {name:'Strathmore School',             code:'STRATH001',  county:'Nairobi', boarding:'day',     gender:'mixed'},
  {name:'Brookhouse School',             code:'BROOKHS01',  county:'Nairobi', boarding:'mixed',   gender:'mixed'},
  {name:'Maranda High School',           code:'MARANDA01',  county:'Siaya',   boarding:'boarding',gender:'boys'},
  {name:'Mugoiri Girls High School',     code:'MUGOIRI01',  county:'Muranga', boarding:'boarding',gender:'girls'},
  {name:'Light Academy',                 code:'LIGHTAC01',  county:'Nairobi', boarding:'day',     gender:'mixed'},
  {name:'Kapsabet Boys High School',     code:'KAPSABT01',  county:'Nandi',   boarding:'boarding',gender:'boys'},
  {name:'Maryhill Girls High School',    code:'MARYHIL01',  county:'Thika',   boarding:'boarding',gender:'girls'},
  {name:'Anester Boys High School',      code:'ANESTER01',  county:'Kisumu',  boarding:'boarding',gender:'boys'},
  {name:'The Aga Khan Academy',          code:'AGAKHAN01',  county:'Mombasa', boarding:'mixed',   gender:'mixed'},
  {name:'Pangani Girls High School',     code:'PANGANI01',  county:'Nairobi', boarding:'day',     gender:'girls'},
  {name:'Chania Boys High School',       code:'CHANIA001',  county:'Muranga', boarding:'boarding',gender:'boys'},
  {name:'Mangu High School',             code:'MANGU0001',  county:'Kiambu',  boarding:'boarding',gender:'boys'},
  {name:'Starehe Boys Centre',           code:'STAREHE01',  county:'Nairobi', boarding:'boarding',gender:'boys'},
  {name:'Asumbi Girls High School',      code:'ASUMBI01',   county:'HomaBay', boarding:'boarding',gender:'girls'},
  {name:'Sunshine Secondary School',     code:'SUNSH001',   county:'Nairobi', boarding:'day',     gender:'mixed'},
  {name:'Nakuru High School',            code:'NAKURU01',   county:'Nakuru',  boarding:'mixed',   gender:'boys'},
  {name:'Nyambaria High School',         code:'NYAMBAR01',  county:'Nyamira', boarding:'boarding',gender:'boys'},
  {name:'Friends School Kamusinga',      code:'KAMUS001',   county:'Bungoma', boarding:'boarding',gender:'boys'},
  {name:'Loreto High School Limuru',     code:'LORETO01',   county:'Kiambu',  boarding:'boarding',gender:'girls'},
  {name:'Kakamega School',               code:'KAKAMG01',   county:'Kakamega',boarding:'boarding',gender:'boys'},
  {name:'Bishop Gatimu Ngandu Girls',    code:'BGNGND01',   county:'Nyeri',   boarding:'boarding',gender:'girls'},
  {name:'Kagumo High School',            code:'KAGUMO01',   county:'Nyeri',   boarding:'boarding',gender:'boys'},
  {name:'Kisii School',                  code:'KISII001',   county:'Kisii',   boarding:'boarding',gender:'boys'},
  {name:'Buruburu Girls Secondary',      code:'BURBRU01',   county:'Nairobi', boarding:'day',     gender:'girls'},
  {name:'Dagoretti High School',         code:'DAGOR001',   county:'Nairobi', boarding:'mixed',   gender:'mixed'},
  {name:'Menengai High School',          code:'MENENG01',   county:'Nakuru',  boarding:'boarding',gender:'mixed'},
  {name:'Agoro Sare High School',        code:'AGORO001',   county:'HomaBay', boarding:'boarding',gender:'boys'},
];

// School-specific first names (unique per region/tribe)
const NAMES = {
  boys: {
    ALLIANCE01: ['James','David','Peter','Samuel','Daniel','Joseph','Emmanuel','Benjamin','Moses','Aaron','Jonathan','Abraham','Isaac','Jacob','Caleb','Joshua','Elijah','Nathan','Solomon','Timothy'],
    KABARAK001: ['Brian','Kevin','Dennis','Collins','Kelvin','Derrick','Geoffrey','Patrick','Francis','Raymond','Clinton','Kenneth','Boniface','Cyrus','Baraka','Samson','Gideon','Ezra','Nehemiah','Laban'],
    MARANDA01:  ['Otieno','Odhiambo','Omondi','Owino','Okello','Odongo','Okoth','Oduya','Ogola','Onyango','Obiero','Opondo','Ochieng','Obondo','Oluoch','Omolo','Opiyo','Ondiek','Okwach','Olima'],
    KAPSABT01:  ['Edwin','Kipkoech','Kiprotich','Kiptanui','Kiprop','Kipkemoi','Kiplimo','Kibet','Kirui','Sigei','Rotich','Chepkwony','Korir','Serem','Ngetich','Yegon','Tanui','Mutai','Meli','Cheruiyot'],
    ANESTER01:  ['Leon','Chris','Mark','Luke','Simon','Andrew','Philip','Thomas','Matthew','Jude','Barnabas','Apollos','Silas','Titus','Philemon','Epaphras','Archippus','Demas','Zenas','Gaius'],
    MANGU0001:  ['Mwenda','Gitonga','Karimi','Kirima','Marete','Mutegi','Njeru','Nthiga','Muriithi','Gatungo','Mungai','Kariuki','Kinyua','Mureithi','Macharia','Mwaniki','Njenga','Kamundi','Murugi','Mwathi'],
    STAREHE01:  ['Felix','Oscar','Arnold','Eugene','Clifford','Reginald','Sebastian','Nathaniel','Cornelius','Leopold','Algernon','Clarence','Mortimer','Roderick','Augustus','Ignatius','Sylvester','Benedict','Ambrose','Clement'],
    NAKURU01:   ['Martin','George','Henry','Edward','William','Richard','Charles','Frederick','Albert','Arthur','Alfred','Herbert','Harold','Leonard','Walter','Ernest','Percy','Sidney','Stanley','Norman'],
    NYAMBAR01:  ['Morara','Moseti','Mokaya','Monari','Moturi','Mochama','Moindi','Motanya','Mogire','Mose','Moranga','Mobu','Mogio','Mobisa','Mogaka','Mogeni','Momanyi','Mogambi','Monsongo','Mose'],
    KAMUS001:   ['Wafula','Wekesa','Simiyu','Masinde','Mukhwana','Shiundu','Namasake','Barasa','Wanyama','Wabwire','Mugisha','Wasike','Wanyonyi','Wandabwa','Muliro','Luvai','Makokha','Khaoya','Nakhanu','Wamukota'],
    KAKAMG01:   ['Innocent','Honest','Righteous','Faithful','Gracious','Merciful','Peaceful','Joyful','Patient','Kind','Humble','Meek','Gentle','Diligent','Prudent','Noble','Valiant','Bold','Brave','Worthy'],
    KAGUMO01:   ['Newton','Darwin','Pascal','Faraday','Maxwell','Boyle','Kelvin','Joule','Watt','Ampere','Ohm','Hertz','Edison','Tesla','Marconi','Bell','Morse','Fleming','Baird','Curie'],
    KISII001:   ['Omari','Morara','Moseti','Mokaya','Monari','Moturi','Mochama','Moindi','Motanya','Mogire','Moranga','Mobu','Mogio','Mobisa','Mogaka','Mogeni','Momanyi','Mogambi','Monsongo','Omache'],
    CHANIA001:  ['Munene','Mureithi','Muriuki','Murimi','Muriki','Muturi','Munyi','Munyua','Muigai','Mwai','Mwangi','Mwariri','Mwenda','Mwoki','Mwololo','Mworia','Mwosi','Mwota','Mwau','Mwau'],
    AGORO001:   ['Zachary','Zebedee','Zedekiah','Zechariah','Zephaniah','Zadok','Zuberi','Zephyr','Zavier','Zeb','Zeke','Zenith','Zeno','Zerah','Zimri','Zion','Zippy','Ziwa','Zoel','Zorion'],
    MENENG01:   ['Roy','Ray','Rex','Reid','Reed','Remi','Remy','Rene','Ren','Rio','Rob','Rod','Ron','Ross','Ruel','Russ','Ryan','Ryne','Rhys','Rowan'],
    DAGOR001:   ['Obed','Obinna','Obiora','Obi','Oba','Obafemi','Obenga','Obengo','Obiero','Obiageli','Obwoge','Obunga','Obwa','Obwaka','Obwori','Obwanda','Obwasa','Obwaga','Obwaya','Obwala'],
    SUNSH001:   ['Cosmos','Atlas','Orion','Phoenix','Blaze','Storm','River','Skyler','Ocean','Forest','Cliff','Dale','Glen','Heath','Lake','Marsh','Moor','Ridge','Vale','Brook'],
    LIGHTAC01:  ['Ahmad','Ali','Ameen','Amir','Anas','Aqeel','Arif','Asim','Ayub','Aziz','Bilal','Faisal','Faraz','Farhan','Hamza','Haris','Hassan','Hussain','Imran','Ibrahim'],
    AGAKHAN01:  ['Karim','Imran','Reza','Tariq','Cyrus','Darius','Rohaan','Rajiv','Vikram','Arjun','Kiran','Sanjay','Rahul','Anil','Suresh','Ramesh','Dinesh','Mahesh','Naresh','Ganesh'],
    STRATH001:  ['Adrian','Antonio','Carlos','Diego','Fernando','Hugo','Javier','Lorenzo','Nicolas','Victor','Pablo','Rafael','Gonzalo','Alejandro','Sebastian','Rodrigo','Andres','Felipe','Sergio','Miguel'],
    BROOKHS01:  ['Aiden','Connor','Ethan','Gavin','Ivan','Kyle','Mason','Oliver','Quinn','Sean','Tyler','Wyatt','Xavier','Zach','Dylan','Evan','Finn','Liam','Noah','Owen'],
    KAGUMO01:   ['Newton','Darwin','Pascal','Faraday','Maxwell','Boyle','Kelvin','Joule','Watt','Ampere','Ohm','Hertz','Edison','Tesla','Marconi','Bell','Morse','Fleming','Baird','Curie'],
    MARIHILL:   ['Angelo','Brice','Cedric','Damien','Emile','Fabrice','Gilles','Henri','Isidore','Jules','Leon','Marcel','Noel','Olivier','Pierre','Quentin','Rene','Stephane','Theo','Urbain'],
  },
  girls: {
    KENYAHIGH1: ['Grace','Faith','Hope','Joy','Peace','Mercy','Patience','Charity','Prudence','Constance','Diligence','Fortitude','Wisdom','Beauty','Favour','Blessing','Promise','Victory','Triumph','Gloria'],
    MUGOIRI01:  ['Wanjiku','Wangari','Wairimu','Wambui','Wanjira','Wanjeri','Wanja','Wangeci','Wangui','Wanjiru','Wangechi','Waruguru','Wayua','Wendo','Winnie','Winifred','Winfrey','Waweru','Wakio','Waki'],
    MARYHIL01:  ['Angela','Beatrice','Catherine','Dorothy','Eleanor','Florence','Gertrude','Helen','Irene','Josephine','Katherine','Lillian','Margaret','Natalie','Olivia','Pamela','Rose','Stella','Teresa','Ursula'],
    PANGANI01:  ['Amina','Fatuma','Zainab','Khadija','Maryam','Aisha','Halima','Safia','Rahma','Nimo','Fardosa','Ifrah','Sagal','Hodan','Deko','Faadumo','Anab','Idiris','Sulekha','Caasha'],
    ASUMBI01:   ['Adhiambo','Akinyi','Anyango','Awino','Atieno','Ajwang','Auma','Awuor','Aketch','Aduda','Akumu','Apiyo','Awiti','Abiero','Akelo','Alando','Alero','Aluoch','Amuge','Andega'],
    LORETO01:   ['Immaculata','Concepcion','Annunciata','Presentacion','Consolation','Dolores','Remedios','Socorro','Pilar','Milagros','Salud','Paz','Esperanza','Caridad','Libertad','Natividad','Asuncion','Resurreccion','Encarnacion','Trinidad'],
    BGNGND01:   ['Nyambura','Njeri','Njoki','Nyawira','Nyaguthii','Nyakinya','Nyakio','Nyagundi','Nyagitari','Nyakinyua','Nyakundi','Nyamache','Nyamari','Nyambeki','Nyambu','Nyamoita','Nyamora','Nyamoyo','Nyamuta','Nyamwera'],
    BURBRU01:   ['Brenda','Carol','Diana','Eva','Fiona','Gina','Hannah','Isabella','Jane','Kate','Laura','Monica','Nancy','Olivia','Priscilla','Queenie','Rachel','Sandra','Tina','Uma'],
  },
  mixed: {
    STRATH001:  ['Adrian','Alexandra','Antonio','Barbara','Carlos','Clara','Diego','Elena','Fernando','Gabriela','Hugo','Isabella','Javier','Julia','Lorenzo','Maria','Nicolas','Sofia','Valentina','Victor'],
    BROOKHS01:  ['Aiden','Brianna','Connor','Daniela','Ethan','Freya','Gavin','Harriet','Ivan','Jasmine','Kyle','Lydia','Mason','Nadia','Oliver','Penelope','Quinn','Rebecca','Sean','Taylor'],
    AGAKHAN01:  ['Karim','Aliya','Imran','Nadia','Zara','Reza','Faiza','Tariq','Layla','Cyrus','Darius','Shireen','Fariha','Rohaan','Ananya','Priya','Rajiv','Sunita','Vikram','Meera'],
    SUNSH001:   ['Leo','Lea','Eli','Ella','Evan','Eva','Eve','Jade','Jake','Jana','Jane','Jean','Jed','Joel','Joey','Jose','Josh','Joy','Juan','June'],
    LIGHTAC01:  ['Ahmad','Aisha','Ali','Amina','Ameen','Amira','Amir','Anas','Anees','Anisa','Aqeel','Arif','Asim','Ayub','Aziz','Bilal','Faisal','Faiza','Faraz','Farhan'],
    MENENG01:   ['Aisha','Ali','Baraka','Bianca','Caleb','Celine','Dennis','Diana','Edwin','Esther','Felix','Felicity','George','Grace','Henry','Hope','Ian','Ivy','Jack','Jade'],
    DAGOR001:   ['Kevin','Mary','Paul','Ann','John','Grace','Moses','Faith','Peter','Joy','Daniel','Hope','Samuel','Mercy','Joseph','Patience','Benjamin','Charity','David','Blessing'],
  }
};

const LAST_NAMES = {
  central: ['Kamau','Mwangi','Njoroge','Gitahi','Mugo','Karanja','Gichuki','Kimani','Njogu','Waweru','Muthoni','Njoki','Wairimu','Wambui','Njeri','Nyambura','Wangare','Gathoni','Kariuki','Kinyua'],
  rift:    ['Koech','Sang','Rono','Bett','Kiptoo','Cheruiyot','Langat','Kipchoge','Kipkemoi','Mutai','Rotich','Sigei','Yegon','Tanui','Ngetich','Serem','Kirui','Kibet','Chepkwony','Korir'],
  nyanza:  ['Otieno','Odhiambo','Ogweno','Owiti','Okeyo','Owuor','Olando','Ogutu','Ooko','Ochola','Ouma','Onyango','Ochieng','Odipo','Okello','Omondi','Owino','Opondo','Ondiek','Obiero'],
  western: ['Wafula','Simiyu','Wekesa','Barasa','Wanyama','Masinde','Makokha','Muliro','Luvai','Khaoya','Wanyonyi','Wandabwa','Namasake','Shiundu','Mukhwana','Namukwaya','Wabwire','Mugisha','Wasike','Namukwaya'],
  kisii:   ['Nyamweya','Bosire','Momanyi','Mogaka','Ongeri','Makori','Morae','Nyambok','Bichanga','Omari','Nyakundi','Nyamache','Nyamoita','Nyamoyo','Nyamuta','Nyamwera','Nyaboke','Nyanchoka','Nyarangi','Nyaribo'],
  coast:   ['Mohamed','Hassan','Ahmed','Ibrahim','Osman','Farouk','Juma','Salim','Bakari','Mwangi','Omar','Rashid','Khalid','Saidi','Mwamba','Charo','Kazungu','Kenga','Ngumbao','Karisa'],
  nairobi: ['Kamau','Otieno','Koech','Mwangi','Ochieng','Njoroge','Sang','Owino','Kimani','Karanja','Shah','Patel','Khan','Ahmed','Ochieng','Wanjiku','Wambui','Achieng','Akinyi','Anyango'],
};

const LAST_BY_SCHOOL = {
  ALLIANCE01:'central', MANGU0001:'central', KAGUMO01:'central', MUGOIRI01:'central',
  STRATH001:'nairobi',  SUNSH001:'nairobi',  DAGOR001:'nairobi', BURBRU01:'nairobi',
  KABARAK001:'rift',    KAPSABT01:'rift',    NAKURU01:'rift',    MENENG01:'rift',
  MARANDA01:'nyanza',   ANESTER01:'nyanza',  ASUMBI01:'nyanza',  AGORO001:'nyanza',
  KAMUS001:'western',   KAKAMG01:'western',
  KISII001:'kisii',     NYAMBAR01:'kisii',
  AGAKHAN01:'coast',    LIGHTAC01:'coast',
  LORETO01:'central',   BGNGND01:'central',  CHANIA001:'central',
  KENYAHIGH1:'nairobi', PANGANI01:'nairobi', MARYHIL01:'central',
  BROOKHS01:'nairobi',  STAREHE01:'nairobi',
};

const SUBJECTS = [
  {name:'English Language',    code:'ENG', category:'core'},
  {name:'Kiswahili',           code:'KSW', category:'core'},
  {name:'Mathematics',         code:'MAT', category:'core'},
  {name:'Biology',             code:'BIO', category:'science'},
  {name:'Chemistry',           code:'CHE', category:'science'},
  {name:'Physics',             code:'PHY', category:'science'},
  {name:'History & Government',code:'HGV', category:'humanities'},
  {name:'Geography',           code:'GEO', category:'humanities'},
  {name:'CRE',                 code:'CRE', category:'humanities'},
  {name:'Agriculture',         code:'AGR', category:'applied'},
  {name:'Computer Studies',    code:'CST', category:'applied'},
  {name:'Business Studies',    code:'BST', category:'applied'},
  {name:'Home Science',        code:'HSC', category:'applied'},
  {name:'Art & Design',        code:'ART', category:'arts'},
  {name:'Music',               code:'MUS', category:'arts'},
];

const EXAM_SERIES = [
  {name:'Term 1 Opening Test 2024',  type:'opener',   start:'2024-01-15',end:'2024-01-19'},
  {name:'Term 1 Mid-Term 2024',      type:'mid_term', start:'2024-02-19',end:'2024-02-23'},
  {name:'Term 1 End Term 2024',      type:'end_term', start:'2024-03-25',end:'2024-03-29'},
  {name:'Term 2 Opening Test 2024',  type:'opener',   start:'2024-05-06',end:'2024-05-10'},
  {name:'Term 2 Mid-Term 2024',      type:'mid_term', start:'2024-06-17',end:'2024-06-21'},
  {name:'Term 2 End Term 2024',      type:'end_term', start:'2024-07-22',end:'2024-07-26'},
  {name:'Term 3 Opening Test 2024',  type:'opener',   start:'2024-09-09',end:'2024-09-13'},
  {name:'KCSE Trial Exam 2024',      type:'mock',     start:'2024-10-07',end:'2024-10-18'},
  {name:'Form Four Trial 2024',      type:'kcse',     start:'2024-10-28',end:'2024-11-08'},
];

function getFirstNames(school, gender) {
  const genderMap = gender === 'boys' ? NAMES.boys : gender === 'girls' ? NAMES.girls : NAMES.mixed;
  return genderMap[school.code] || NAMES.boys.ALLIANCE01;
}

function getLastNames(school) {
  const region = LAST_BY_SCHOOL[school.code] || 'nairobi';
  return LAST_NAMES[region];
}

async function seed() {
  console.log('🌱 Starting ElimuSaaS demo seed...\n');
  const pwdHash = await bcrypt.hash('School@2024!', 10);
  const superPwd = await bcrypt.hash('SuperAdmin@2025!', 10);

  // Super admin
  await q(`INSERT INTO users(id,email,password_hash,role,first_name,last_name,is_active,is_email_verified)
           VALUES($1,$2,$3,'super_admin','Super','Admin',true,true)
           ON CONFLICT(email) DO UPDATE SET password_hash=$3`,
    [uuid(),'superadmin@elimusaas.com',superPwd]);
  console.log('✅ Super admin ready');

  for (const school of SCHOOLS) {
    try {
      console.log(`\n🏫 Seeding ${school.name}...`);
      const schoolId = uuid();
      const adminEmail = `admin@${school.code.toLowerCase()}.ke`;

      // 1. Admin user
      const { rows: adminRows } = await q(`
        INSERT INTO users(id,email,password_hash,role,first_name,last_name,phone,is_active,is_email_verified)
        VALUES($1,$2,$3,'school_admin','Admin','User',$4,true,true)
        ON CONFLICT(email) DO UPDATE SET password_hash=$3
        RETURNING id`,
        [uuid(),adminEmail,pwdHash,`+2547${randInt(10,99)}${randInt(100000,999999)}`]);
      const adminId = adminRows[0].id;

      // 2. School
      const { rows: schoolRows } = await q(`
        INSERT INTO schools(id,school_code,name,short_name,type,boarding_type,county,
          email,phone,address,motto,founded_year,is_active,is_verified)
        VALUES($1,$2,$3,$4,'secondary',$5,$6,$7,$8,$9,$10,$11,true,true)
        ON CONFLICT(school_code) DO UPDATE SET name=$3, is_active=true
        RETURNING id`,
        [schoolId,school.code,school.name,school.code.slice(0,8),
         school.boarding,school.county,adminEmail,
         `+2547${randInt(10,99)}${randInt(100000,999999)}`,
         `P.O. Box ${randInt(1,999)}-${randInt(10000,99999)}, ${school.county}`,
         'Excellence in Education',randInt(1950,2000)]);
      const actualSchoolId = schoolRows[0].id;

      await q(`UPDATE users SET school_id=$1 WHERE id=$2`,[actualSchoolId,adminId]);

      // 3. Academic year
      const yearId = uuid();
      await q(`
        INSERT INTO academic_years(id,school_id,year,label,start_date,end_date,is_current)
        VALUES($1,$2,2024,'2024','2024-01-08','2024-11-15',true)
        ON CONFLICT(school_id,year) DO UPDATE SET is_current=true`,
        [yearId,actualSchoolId]);
      // Get actual yearId (may differ if conflict)
      const {rows:yrRows} = await q(
        `SELECT id FROM academic_years WHERE school_id=$1 AND year=2024`,[actualSchoolId]);
      const actualYearId = yrRows[0].id;

      // 4. Classes - Form 1-4 x 3 streams
      const streams = ['A','B','C'];
      const classMap = {};
      for (let form=1;form<=4;form++) {
        for (const s of streams) {
          const cid = uuid();
          const {rows:cr} = await q(`
            INSERT INTO classes(id,school_id,name,level,stream,is_active)
            VALUES($1,$2,$3,$4,$5,true)
            ON CONFLICT(school_id,level,stream) DO UPDATE SET name=$3
            RETURNING id`,
            [cid,actualSchoolId,`Form ${form}`,form,s]);
          classMap[`${form}${s}`] = cr[0].id;
        }
      }

      // 5. Subjects (unique per school to avoid conflict on school_id+code)
      const subjectMap = {};
      for (const sub of SUBJECTS) {
        const sid = uuid();
        const {rows:sr} = await q(`
          INSERT INTO subjects(id,school_id,name,code,category)
          VALUES($1,$2,$3,$4,$5)
          ON CONFLICT(school_id,code) DO UPDATE SET name=$3
          RETURNING id`,
          [sid,actualSchoolId,sub.name,sub.code,sub.category]);
        subjectMap[sub.code] = sr[0].id;
      }

      // 6. Teachers (20 per school)
      const teacherIds = [];
      const tFirstNames = ['James','Mary','Peter','Grace','John','Faith','David','Hope','Paul','Joy',
                           'Moses','Mercy','Joseph','Patience','Daniel','Charity','Samuel','Prudence','Aaron','Constance'];
      const tLastNames  = getLastNames(school);

      for (let i=0;i<20;i++) {
        const tEmail = `teacher${i+1}.${school.code.toLowerCase()}@elimusaas.ke`;
        const fn = tFirstNames[i];
        const ln = tLastNames[i % tLastNames.length];
        const {rows:tr} = await q(`
          INSERT INTO users(id,school_id,email,password_hash,role,first_name,last_name,phone,is_active,is_email_verified)
          VALUES($1,$2,$3,$4,'teacher',$5,$6,$7,true,true)
          ON CONFLICT(email) DO UPDATE SET school_id=$2
          RETURNING id`,
          [uuid(),actualSchoolId,tEmail,pwdHash,fn,ln,`+2547${randInt(10,99)}${randInt(100000,999999)}`]);
        const tUserId = tr[0].id;

        await q(`
          INSERT INTO staff(id,school_id,user_id,staff_number,tsc_number,designation,
            department,employment_type,employment_date,qualification,is_hod,is_active)
          VALUES($1,$2,$3,$4,$5,'Teacher',$6,'permanent','2020-01-01','Bachelor Degree',$7,true)
          ON CONFLICT DO NOTHING`,
          [uuid(),actualSchoolId,tUserId,
           `${school.code.slice(0,4)}/T/${String(i+1).padStart(3,'0')}`,
           `TSC/${randInt(100000,999999)}`,
           ['Mathematics','Sciences','English','Kiswahili','Humanities','Technical'][i%6],
           i<3]);
        teacherIds.push(tUserId);
      }

      // Other staff (Deputy, Bursar, Librarian, Dean)
      const otherStaff = [
        {role:'deputy_principal',fn:'Deputy',ln:'Principal',desig:'Deputy Principal (Academics)'},
        {role:'bursar',fn:'School',ln:'Bursar',desig:'Bursar'},
        {role:'librarian',fn:'Head',ln:'Librarian',desig:'Librarian'},
        {role:'dean_of_studies',fn:'Dean',ln:'Studies',desig:'Dean of Studies'},
      ];
      for (const os of otherStaff) {
        const oEmail = `${os.role}.${school.code.toLowerCase()}@elimusaas.ke`;
        const {rows:or} = await q(`
          INSERT INTO users(id,school_id,email,password_hash,role,first_name,last_name,is_active,is_email_verified)
          VALUES($1,$2,$3,$4,$5,$6,$7,true,true)
          ON CONFLICT(email) DO UPDATE SET school_id=$2
          RETURNING id`,
          [uuid(),actualSchoolId,oEmail,pwdHash,os.role,os.fn,os.ln]);
        await q(`
          INSERT INTO staff(id,school_id,user_id,staff_number,designation,department,employment_type,employment_date,is_active)
          VALUES($1,$2,$3,$4,$5,'Administration','permanent','2019-01-01',true)
          ON CONFLICT DO NOTHING`,
          [uuid(),actualSchoolId,or[0].id,
           `${school.code.slice(0,4)}/S/${os.role.slice(0,3).toUpperCase()}`,os.desig]);
      }

      // 7. Assign subjects to classes+teachers
      const subCodes = Object.keys(subjectMap);
      for (let form=1;form<=4;form++) {
        for (const s of streams) {
          const cid = classMap[`${form}${s}`];
          for (let i=0;i<subCodes.length;i++) {
            const sid = subjectMap[subCodes[i]];
            const tid = teacherIds[i % teacherIds.length];
            await q(`
              INSERT INTO class_subjects(id,school_id,class_id,subject_id,teacher_id,academic_year_id)
              VALUES($1,$2,$3,$4,$5,$6)
              ON CONFLICT(class_id,subject_id,academic_year_id,term_id) DO UPDATE SET teacher_id=$5`,
              [uuid(),actualSchoolId,cid,sid,tid,actualYearId]).catch(()=>
              // If conflict target doesn't match, try without term_id
              q(`INSERT INTO class_subjects(id,school_id,class_id,subject_id,teacher_id,academic_year_id)
                 VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
                [uuid(),actualSchoolId,cid,sid,tid,actualYearId])
            );
          }
        }
      }

      // 8. Students (22-26 per stream)
      const firstNames = getFirstNames(school,school.gender);
      const lastNames  = getLastNames(school);
      const usedNames  = new Set();
      let admSeq = 1;

      for (let form=1;form<=4;form++) {
        for (const s of streams) {
          const cid = classMap[`${form}${s}`];
          const count = randInt(22,26);
          for (let i=0;i<count;i++) {
            let fn,ln,key,tries=0;
            do {
              fn = firstNames[Math.floor(Math.random()*firstNames.length)];
              ln = lastNames[Math.floor(Math.random()*lastNames.length)];
              key = `${fn}${ln}`;
              tries++;
            } while(usedNames.has(key) && tries<30);
            usedNames.add(key);

            const admNo = `${school.code.slice(0,4)}${2024-form+1}${String(admSeq).padStart(4,'0')}`;
            const g = school.gender==='boys'?'male':school.gender==='girls'?'female':
                      Math.random()>0.5?'male':'female';
            const dob = new Date(2024-14-form,randInt(0,11),randInt(1,28));

            await q(`
              INSERT INTO students(id,school_id,first_name,last_name,admission_number,gender,
                date_of_birth,current_class_id,admission_date,is_boarding,is_active,
                kcpe_index_number,blood_group)
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12)
              ON CONFLICT(school_id,admission_number) DO NOTHING`,
              [uuid(),actualSchoolId,fn,ln,admNo,g,dob.toISOString().split('T')[0],
               cid,`${2024-form+1}-01-15`,
               school.boarding==='boarding'||(school.boarding==='mixed'&&Math.random()>0.5),
               `${school.code.slice(0,3)}${2024-form+1}${randInt(10000,99999)}`,
               ['A+','A-','B+','B-','O+','O-','AB+','AB-'][randInt(0,7)]
              ]).catch(()=>{});
            admSeq++;
          }
        }
      }

      // 9. Exam series + papers + marks (6 completed series)
      const baseMean = {ALLIANCE01:72,KENYAHIGH1:68,MARANDA01:70,MANGU0001:71,STAREHE01:73}[school.code]||60;
      const {rows:allStudents} = await q(
        `SELECT id,current_class_id FROM students WHERE school_id=$1 AND is_active=true`,[actualSchoolId]);
      const studentsByClass = {};
      allStudents.forEach(st=>{
        if(!studentsByClass[st.current_class_id]) studentsByClass[st.current_class_id]=[];
        studentsByClass[st.current_class_id].push(st.id);
      });

      for (let ei=0;ei<6;ei++) {
        const es = EXAM_SERIES[ei];
        const esId = uuid();
        const allClassIds = Object.values(classMap);
        await q(`
          INSERT INTO exam_series(id,school_id,academic_year_id,name,type,classes,start_date,end_date,is_locked,created_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9)
          ON CONFLICT DO NOTHING`,
          [esId,actualSchoolId,actualYearId,es.name,es.type,
           `{${allClassIds.join(',')}}`,es.start,es.end,adminId]);

        for (let form=1;form<=4;form++) {
          for (const s of streams) {
            const cid = classMap[`${form}${s}`];
            const studs = studentsByClass[cid]||[];
            if(!studs.length) continue;

            for (let si=0;si<subCodes.length;si++) {
              const subId = subjectMap[subCodes[si]];
              const tid   = teacherIds[si%teacherIds.length];
              const paperId = uuid();

              await q(`
                INSERT INTO exam_papers(id,exam_series_id,school_id,class_id,subject_id,
                  teacher_id,max_marks,is_submitted,submitted_at,hod_approved)
                VALUES($1,$2,$3,$4,$5,$6,100,true,NOW(),true)
                ON CONFLICT(exam_series_id,class_id,subject_id) DO UPDATE SET is_submitted=true
                RETURNING id`,
                [paperId,esId,actualSchoolId,cid,subId,tid]);

              // Marks for all students in this class
              for (const stId of studs) {
                const m = Math.min(100,Math.max(15,Math.round(baseMean+(Math.random()-0.5)*30)));
                const {g:gr,p:pts} = grade(m);
                await q(`
                  INSERT INTO student_marks(id,exam_paper_id,student_id,school_id,marks,grade,points,is_absent)
                  VALUES($1,$2,$3,$4,$5,$6,$7,false)
                  ON CONFLICT(exam_paper_id,student_id) DO NOTHING`,
                  [uuid(),paperId,stId,actualSchoolId,m,gr,pts]).catch(()=>{});
              }
            }
          }
        }
      }

      // 10. Fee structure + payments
      const fsId = uuid();
      await q(`
        INSERT INTO fee_structures(id,school_id,academic_year_id,name,applies_to_all_classes,is_active,created_by)
        VALUES($1,$2,$3,'2024 Term 1 Fees',true,true,$4)
        ON CONFLICT DO NOTHING`,
        [fsId,actualSchoolId,actualYearId,adminId]);

      const termFee = school.boarding==='boarding'?35000:school.boarding==='mixed'?28000:18000;
      for (const st of allStudents.slice(0,150)) {
        if(Math.random()<0.7) {
          const pct = Math.random()>0.5?1:(0.3+Math.random()*0.7);
          const amt = Math.round(termFee*pct);
          const methods=['cash','mpesa_stk','bank_transfer','mpesa_paybill'];
          await q(`
            INSERT INTO fee_payments(id,school_id,student_id,fee_structure_id,academic_year_id,
              receipt_number,amount,payment_method,payment_date,status,created_by)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'completed',$10)
            ON CONFLICT(school_id,receipt_number) DO NOTHING`,
            [uuid(),actualSchoolId,st.id,fsId,actualYearId,
             `RCP-${school.code}-${Date.now()}-${randInt(1000,9999)}`,
             amt,rand(methods),
             new Date(2024,randInt(0,9),randInt(1,28)).toISOString().split('T')[0],
             adminId]).catch(()=>{});
        }
      }

      console.log(`   ✅ Done: ${school.name}`);
    } catch(err) {
      console.error(`   ❌ Failed ${school.name}:`, err.message);
      // Continue to next school
    }
  }

  console.log('\n\n🎉 SEED COMPLETE!');
  console.log('Login: superadmin@elimusaas.com / SuperAdmin@2025!');
  console.log('School admin: admin@alliance01.ke / School@2024!');
  console.log('Teacher: teacher1.alliance01@elimusaas.ke / School@2024!');
}

module.exports = seed;
if (require.main === module) {
  seed().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
}
