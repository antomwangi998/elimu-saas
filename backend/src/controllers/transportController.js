const { query } = require('../config/database');
exports.getVehicles = async (req,res) => {
  try {
    const {rows}=await query(`SELECT v.*,(SELECT COUNT(*) FROM transport_subscriptions WHERE route_id IN (SELECT id FROM transport_routes WHERE vehicle_id=v.id) AND year=EXTRACT(YEAR FROM NOW())) AS students FROM transport_vehicles v WHERE v.school_id=$1 ORDER BY v.route_name`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createVehicle = async (req,res) => {
  try {
    const {registration,make,model,capacity,driverName,driverPhone,routeName,insuranceExpiry,inspectionExpiry}=req.body;
    const {rows}=await query(`INSERT INTO transport_vehicles(school_id,registration,make,model,capacity,driver_name,driver_phone,route_name,insurance_expiry,inspection_expiry) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[req.schoolId,registration,make,model,capacity||30,driverName,driverPhone,routeName,insuranceExpiry||null,inspectionExpiry||null]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getRoutes = async (req,res) => {
  try {
    const {rows}=await query(`SELECT r.*,v.registration,v.driver_name,(SELECT COUNT(*) FROM transport_subscriptions WHERE route_id=r.id AND year=EXTRACT(YEAR FROM NOW())) AS subscriber_count FROM transport_routes r LEFT JOIN transport_vehicles v ON r.vehicle_id=v.id WHERE r.school_id=$1`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createRoute = async (req,res) => {
  try {
    const {vehicleId,name,description,morningDeparture,afternoonDeparture,stops,monthlyFee,termFee}=req.body;
    const {rows}=await query(`INSERT INTO transport_routes(school_id,vehicle_id,name,description,morning_departure,afternoon_departure,stops,monthly_fee,term_fee) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[req.schoolId,vehicleId||null,name,description,morningDeparture||null,afternoonDeparture||null,JSON.stringify(stops||[]),monthlyFee||0,termFee||0]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getSubscriptions = async (req,res) => {
  try {
    const {rows}=await query(`SELECT ts.*,u.first_name,u.last_name,u.admission_number,c.name AS class_name,r.name AS route_name FROM transport_subscriptions ts JOIN users u ON ts.student_id=u.id LEFT JOIN classes c ON u.class_id=c.id JOIN transport_routes r ON ts.route_id=r.id WHERE ts.school_id=$1 ORDER BY r.name,u.last_name`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.subscribe = async (req,res) => {
  try {
    const {studentId,routeId,pickupStop,term,year}=req.body;
    const {rows}=await query(`INSERT INTO transport_subscriptions(school_id,student_id,route_id,pickup_stop,term,year) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(school_id,student_id,term,year) DO UPDATE SET route_id=$3,pickup_stop=$4 RETURNING *`,[req.schoolId,studentId,routeId,pickupStop,term,year||new Date().getFullYear()]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.updateVehicle = async (req,res) => {
  try {
    const {id}=req.params;
    const {registration,make,model,capacity,driverName,driverPhone,routeName,isActive}=req.body;
    const {rows}=await query(`UPDATE transport_vehicles SET registration=$1,make=$2,model=$3,capacity=$4,driver_name=$5,driver_phone=$6,route_name=$7,is_active=$8 WHERE id=$9 AND school_id=$10 RETURNING *`,[registration,make,model,capacity,driverName,driverPhone,routeName,isActive!==false,id,req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
