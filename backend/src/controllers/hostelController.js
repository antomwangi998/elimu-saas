const { query } = require('../config/database');
exports.getHostels = async (req,res) => {
  try {
    const {rows} = await query(`SELECT h.*,u.first_name||' '||u.last_name AS warden_name,
      (SELECT COUNT(*) FROM hostel_allocations WHERE hostel_id=h.id AND status='active') AS current_occupancy
      FROM hostels h LEFT JOIN users u ON h.warden_id=u.id WHERE h.school_id=$1 ORDER BY h.name`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createHostel = async (req,res) => {
  try {
    const {name,gender,capacity,wardenId,description} = req.body;
    const {rows} = await query(`INSERT INTO hostels(school_id,name,gender,capacity,warden_id,description) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.schoolId,name,gender||'mixed',capacity||0,wardenId||null,description]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getRooms = async (req,res) => {
  try {
    const {hostelId} = req.params;
    const {rows} = await query(`SELECT r.*,(SELECT COUNT(*) FROM hostel_allocations WHERE room_id=r.id AND status='active') AS current_occ FROM hostel_rooms r WHERE r.hostel_id=$1 AND r.school_id=$2 ORDER BY r.room_number`,[hostelId,req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createRoom = async (req,res) => {
  try {
    const {hostelId} = req.params;
    const {roomNumber,capacity,roomType} = req.body;
    const {rows} = await query(`INSERT INTO hostel_rooms(school_id,hostel_id,room_number,capacity,room_type) VALUES($1,$2,$3,$4,$5) RETURNING *`,[req.schoolId,hostelId,roomNumber,capacity||4,roomType||'dormitory']);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getAllocations = async (req,res) => {
  try {
    const {term,year,hostelId} = req.query;
    let sql=`SELECT ha.*,u.first_name,u.last_name,u.admission_number,c.name AS class_name,h.name AS hostel_name,r.room_number FROM hostel_allocations ha JOIN users u ON ha.student_id=u.id LEFT JOIN classes c ON u.class_id=c.id JOIN hostels h ON ha.hostel_id=h.id JOIN hostel_rooms r ON ha.room_id=r.id WHERE ha.school_id=$1 AND ha.status='active'`;
    const params=[req.schoolId];
    if(term){params.push(term);sql+=` AND ha.term=$${params.length}`;}
    if(year){params.push(year);sql+=` AND ha.year=$${params.length}`;}
    if(hostelId){params.push(hostelId);sql+=` AND ha.hostel_id=$${params.length}`;}
    sql+=' ORDER BY h.name,r.room_number,u.last_name';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.allocate = async (req,res) => {
  try {
    const {studentId,hostelId,roomId,bedNumber,term,year} = req.body;
    const {rows:rm}=await query(`SELECT r.*,(SELECT COUNT(*) FROM hostel_allocations WHERE room_id=r.id AND status='active') AS occ FROM hostel_rooms r WHERE r.id=$1`,[roomId]);
    if(!rm.length) return res.status(404).json({error:'Room not found'});
    if(parseInt(rm[0].occ)>=rm[0].capacity) return res.status(400).json({error:`Room full (${rm[0].capacity} beds)`});
    const {rows}=await query(`INSERT INTO hostel_allocations(school_id,student_id,hostel_id,room_id,bed_number,term,year,allocated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(school_id,student_id,term,year) DO UPDATE SET hostel_id=$3,room_id=$4,bed_number=$5,status='active' RETURNING *`,[req.schoolId,studentId,hostelId,roomId,bedNumber,term,year||new Date().getFullYear(),req.user.id]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.vacate = async (req,res) => {
  try {
    const {id}=req.params;
    await query(`UPDATE hostel_allocations SET status='vacated',check_out_date=CURRENT_DATE WHERE id=$1 AND school_id=$2`,[id,req.schoolId]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getStats = async (req,res) => {
  try {
    const {rows}=await query(`SELECT h.name,h.capacity,(SELECT COUNT(*) FROM hostel_allocations WHERE hostel_id=h.id AND status='active') AS occupied FROM hostels h WHERE h.school_id=$1`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
