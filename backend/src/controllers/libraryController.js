// ============================================================
// Library Controller — Full Circulation System
// ============================================================
const { query } = require('../config/database');

// ── Books ─────────────────────────────────────────────────────
const getBooks = async (req, res) => {
  try {
    const { search, category, available, limit=50, offset=0 } = req.query;
    let sql = `SELECT lb.*,
               COALESCE((SELECT COUNT(*) FROM library_borrowings WHERE book_id=lb.id AND status='borrowed'),0) AS copies_out,
               lb.available_copies,
               (SELECT COUNT(*) FROM library_reservations WHERE book_id=lb.id AND status='active') AS reservations
               FROM library_books lb WHERE lb.school_id=$1`;
    const params=[req.schoolId];
    if(category){params.push(category);sql+=` AND lb.category=$${params.length}`;}
    if(search){params.push(`%${search}%`);sql+=` AND (lb.title ILIKE $${params.length} OR lb.author ILIKE $${params.length} OR lb.isbn ILIKE $${params.length})`;}
    if(available==='true') sql+=' AND lb.available_copies>0';
    sql+=` ORDER BY lb.title LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const {rows}=await query(sql,params);
    const {rows:cnt}=await query(`SELECT COUNT(*) FROM library_books WHERE school_id=$1`,[req.schoolId]);
    res.json({data:rows,total:parseInt(cnt[0].count)});
  } catch(e){res.status(500).json({error:e.message});}
};

const getBook = async (req,res) => {
  try {
    const {id}=req.params;
    const {rows}=await query(`SELECT * FROM library_books WHERE id=$1 AND school_id=$2`,[id,req.schoolId]);
    if(!rows.length) return res.status(404).json({error:'Book not found'});
    const {rows:borrows}=await query(
      `SELECT lb.*, u.first_name||' '||u.last_name AS borrower_name, u.admission_number
       FROM library_borrowings lb JOIN users u ON lb.borrower_id=u.id
       WHERE lb.book_id=$1 AND lb.status='borrowed' ORDER BY lb.issue_date DESC`,[id]);
    res.json({...rows[0],currentBorrowings:borrows});
  } catch(e){res.status(500).json({error:e.message});}
};

const addBook = async (req,res) => {
  try {
    const {title,author,isbn,publisher,publicationYear,edition,category,subject,totalCopies=1,locationShelf,description,summary}=req.body;
    if(!title||!author) return res.status(400).json({error:'Title and author required'});
    const {rows}=await query(
      `INSERT INTO library_books(school_id,title,author,isbn,publisher,publication_year,edition,category,subject,total_copies,available_copies,location_shelf,description,summary)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13) RETURNING *`,
      [req.schoolId,title,author,isbn,publisher,publicationYear,edition,category,subject,totalCopies,locationShelf,description,summary]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const updateBook = async (req,res) => {
  try {
    const {title,author,category,subject,totalCopies,locationShelf,summary}=req.body;
    const {rows}=await query(
      `UPDATE library_books SET title=$1,author=$2,category=$3,subject=$4,total_copies=$5,location_shelf=$6,summary=$7,updated_at=NOW()
       WHERE id=$8 AND school_id=$9 RETURNING *`,
      [title,author,category,subject,totalCopies,locationShelf,summary,req.params.id,req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const deleteBook = async (req,res) => {
  try {
    await query(`DELETE FROM library_books WHERE id=$1 AND school_id=$2`,[req.params.id,req.schoolId]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};

// ── Members ───────────────────────────────────────────────────
const getMembers = async (req,res) => {
  try {
    const {rows}=await query(
      `SELECT lm.*,u.first_name,u.last_name,u.admission_number,u.role,
              (SELECT COUNT(*) FROM library_borrowings WHERE borrower_id=lm.user_id AND status='borrowed') AS books_out,
              (SELECT COALESCE(SUM(fine_amount),0) FROM library_borrowings WHERE borrower_id=lm.user_id AND fine_paid=false AND fine_amount>0) AS outstanding_fines
       FROM library_members lm JOIN users u ON lm.user_id=u.id
       WHERE lm.school_id=$1 ORDER BY u.last_name`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const registerMember = async (req,res) => {
  try {
    const {userId,memberType='student',maxBooks=3}=req.body;
    const {rows:u}=await query(`SELECT * FROM users WHERE id=$1 AND school_id=$2`,[userId,req.schoolId]);
    if(!u.length) return res.status(404).json({error:'User not found'});
    const num=`LIB-${Date.now().toString().slice(-6)}`;
    const {rows}=await query(
      `INSERT INTO library_members(school_id,user_id,member_type,membership_number,max_books)
       VALUES($1,$2,$3,$4,$5) ON CONFLICT(school_id,user_id) DO UPDATE SET is_active=true,max_books=$5 RETURNING *`,
      [req.schoolId,userId,memberType,num,maxBooks]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

// ── Borrowings ────────────────────────────────────────────────
const getBorrowings = async (req,res) => {
  try {
    const {status,borrowerId,overdue,limit=100}=req.query;
    let sql=`SELECT lb.*,bk.title,bk.author,bk.isbn,
             u.first_name||' '||u.last_name AS borrower_name, u.admission_number, u.role,
             ib.first_name||' '||ib.last_name AS issued_by_name,
             CASE WHEN lb.status='borrowed' AND lb.due_date<CURRENT_DATE THEN true ELSE false END AS is_overdue,
             CASE WHEN lb.status='borrowed' AND lb.due_date<CURRENT_DATE THEN (CURRENT_DATE-lb.due_date)*5 ELSE 0 END AS current_fine
             FROM library_borrowings lb
             JOIN library_books bk ON lb.book_id=bk.id
             JOIN users u ON lb.borrower_id=u.id
             LEFT JOIN users ib ON lb.issued_by=ib.id
             WHERE lb.school_id=$1`;
    const params=[req.schoolId];
    if(status){params.push(status);sql+=` AND lb.status=$${params.length}`;}
    if(borrowerId){params.push(borrowerId);sql+=` AND lb.borrower_id=$${params.length}`;}
    if(overdue==='true') sql+=' AND lb.status=\'borrowed\' AND lb.due_date<CURRENT_DATE';
    sql+=` ORDER BY lb.issue_date DESC LIMIT ${parseInt(limit)}`;
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const issueBook = async (req,res) => {
  try {
    const {bookId,borrowerId,dueDate}=req.body;
    if(!bookId||!borrowerId) return res.status(400).json({error:'Book and borrower required'});
    // Check availability
    const {rows:bk}=await query(`SELECT * FROM library_books WHERE id=$1 AND school_id=$2`,[bookId,req.schoolId]);
    if(!bk.length) return res.status(404).json({error:'Book not found'});
    if(bk[0].available_copies<1) return res.status(400).json({error:`No copies available. ${bk[0].total_copies} total, all out.`});
    // Check member
    const {rows:mem}=await query(`SELECT * FROM library_members WHERE user_id=$1 AND school_id=$2 AND is_active=true`,[borrowerId,req.schoolId]);
    if(!mem.length) return res.status(400).json({error:'Borrower is not a registered library member'});
    // Check outstanding books count
    const {rows:cnt}=await query(`SELECT COUNT(*) FROM library_borrowings WHERE borrower_id=$1 AND status='borrowed'`,[borrowerId]);
    if(parseInt(cnt[0].count)>=mem[0].max_books) return res.status(400).json({error:`Borrower has reached max books limit (${mem[0].max_books})`});
    // Check overdue
    const {rows:od}=await query(`SELECT COUNT(*) FROM library_borrowings WHERE borrower_id=$1 AND status='borrowed' AND due_date<CURRENT_DATE`,[borrowerId]);
    if(parseInt(od[0].count)>0) return res.status(400).json({error:'Borrower has overdue books. Return them first.'});

    const due=dueDate||new Date(Date.now()+14*864e5).toISOString().split('T')[0];
    const {rows}=await query(
      `INSERT INTO library_borrowings(school_id,book_id,borrower_id,issued_by,issue_date,due_date,status)
       VALUES($1,$2,$3,$4,CURRENT_DATE,$5,'borrowed') RETURNING *`,
      [req.schoolId,bookId,borrowerId,req.user.id,due]);
    await query(`UPDATE library_books SET available_copies=available_copies-1 WHERE id=$1`,[bookId]);
    res.json({...rows[0],bookTitle:bk[0].title});
  } catch(e){res.status(500).json({error:e.message});}
};

const returnBook = async (req,res) => {
  try {
    const {borrowingId,conditionOnReturn='good',notes}=req.body;
    const {rows:b}=await query(`SELECT * FROM library_borrowings WHERE id=$1 AND school_id=$2`,[borrowingId,req.schoolId]);
    if(!b.length||b[0].status!=='borrowed') return res.status(404).json({error:'Borrowing not found or already returned'});
    const daysOverdue=Math.max(0,Math.floor((Date.now()-new Date(b[0].due_date))/(864e5)));
    const fine=daysOverdue*5;
    await query(
      `UPDATE library_borrowings SET status='returned',return_date=CURRENT_DATE,returned_by=$1,condition_on_return=$2,fine_amount=$3,notes=$4 WHERE id=$5`,
      [req.user.id,conditionOnReturn,fine,notes,borrowingId]);
    await query(`UPDATE library_books SET available_copies=available_copies+1 WHERE id=$1`,[b[0].book_id]);
    if(fine>0){
      await query(`INSERT INTO library_fines(school_id,borrowing_id,student_id,fine_type,amount,days_overdue) VALUES($1,$2,$3,'overdue',$4,$5)`,
        [req.schoolId,borrowingId,b[0].borrower_id,fine,daysOverdue]);
    }
    res.json({success:true,fine,daysOverdue,message:fine>0?`Returned with KES ${fine} fine (${daysOverdue} days overdue)`:'Returned on time ✅'});
  } catch(e){res.status(500).json({error:e.message});}
};

const renewBook = async (req,res) => {
  try {
    const {borrowingId,extensionDays=7}=req.body;
    const {rows}=await query(
      `UPDATE library_borrowings SET due_date=due_date+$1 WHERE id=$2 AND school_id=$3 AND status='borrowed' RETURNING *`,
      [extensionDays,borrowingId,req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

// ── Fines ─────────────────────────────────────────────────────
const getFines = async (req,res) => {
  try {
    const {rows}=await query(
      `SELECT lf.*,u.first_name||' '||u.last_name AS student_name,u.admission_number,bk.title AS book_title
       FROM library_fines lf JOIN users u ON lf.student_id=u.id
       JOIN library_borrowings lb ON lf.borrowing_id=lb.id
       JOIN library_books bk ON lb.book_id=bk.id
       WHERE lf.school_id=$1 ORDER BY lf.created_at DESC`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const payFine = async (req,res) => {
  try {
    const {fineId}=req.body;
    await query(`UPDATE library_fines SET is_paid=true,paid_at=NOW() WHERE id=$1 AND school_id=$2`,[fineId,req.schoolId]);
    await query(`UPDATE library_borrowings SET fine_paid=true,fine_paid_at=NOW() WHERE id=(SELECT borrowing_id FROM library_fines WHERE id=$1)`,[fineId]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};

const waiveFine = async (req,res) => {
  try {
    const {fineId,reason}=req.body;
    await query(`UPDATE library_fines SET waived=true,waived_by=$1,waived_reason=$2 WHERE id=$3 AND school_id=$4`,[req.user.id,reason,fineId,req.schoolId]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};

// ── Reservations ──────────────────────────────────────────────
const reserveBook = async (req,res) => {
  try {
    const {bookId,userId}=req.body;
    const expires=new Date(Date.now()+3*864e5).toISOString();
    const {rows}=await query(
      `INSERT INTO library_reservations(school_id,book_id,user_id,expires_at) VALUES($1,$2,$3,$4) RETURNING *`,
      [req.schoolId,bookId,userId||req.user.id,expires]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const getStats = async (req,res) => {
  try {
    const {rows}=await query(
      `SELECT COUNT(DISTINCT lb.id) AS total_books, SUM(lb.total_copies) AS total_copies,
              SUM(lb.available_copies) AS available,
              (SELECT COUNT(*) FROM library_borrowings WHERE school_id=$1 AND status='borrowed') AS currently_borrowed,
              (SELECT COUNT(*) FROM library_borrowings WHERE school_id=$1 AND status='borrowed' AND due_date<CURRENT_DATE) AS overdue,
              (SELECT COALESCE(SUM(amount),0) FROM library_fines WHERE school_id=$1 AND is_paid=false AND waived=false) AS outstanding_fines,
              (SELECT COUNT(*) FROM library_members WHERE school_id=$1 AND is_active=true) AS active_members
       FROM library_books lb WHERE lb.school_id=$1`,[req.schoolId]);
    const {rows:top}=await query(
      `SELECT bk.title,bk.author,COUNT(lb.id) AS times_borrowed
       FROM library_borrowings lb JOIN library_books bk ON lb.book_id=bk.id
       WHERE lb.school_id=$1 GROUP BY bk.id ORDER BY times_borrowed DESC LIMIT 10`,[req.schoolId]);
    const {rows:recent}=await query(
      `SELECT lb.*,bk.title,u.first_name||' '||u.last_name AS borrower FROM library_borrowings lb
       JOIN library_books bk ON lb.book_id=bk.id JOIN users u ON lb.borrower_id=u.id
       WHERE lb.school_id=$1 ORDER BY lb.created_at DESC LIMIT 10`,[req.schoolId]);
    res.json({...rows[0],topBooks:top,recentActivity:recent});
  } catch(e){res.status(500).json({error:e.message});}
};

// Update library route to use new functions
module.exports = {getBooks,getBook,addBook,updateBook,deleteBook,getMembers,registerMember,getBorrowings,issueBook,returnBook,renewBook,getFines,payFine,waiveFine,reserveBook,getStats};
