const { query } = require('../config/database');
exports.getBranding = async (req,res) => {
  try {
    const {rows}=await query(`SELECT * FROM school_branding WHERE school_id=$1`,[req.schoolId]);
    res.json(rows[0]||{school_id:req.schoolId,primary_color:'#2b7fff',secondary_color:'#1a1a2e',accent_color:'#0ecb81',is_white_labeled:false});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.saveBranding = async (req,res) => {
  try {
    const {primaryColor,secondaryColor,accentColor,logoUrl,faviconUrl,bannerUrl,footerText,customCss,smsSenderId,customDomain,isWhiteLabeled}=req.body;
    const {rows}=await query(`INSERT INTO school_branding(school_id,primary_color,secondary_color,accent_color,logo_url,favicon_url,banner_url,footer_text,custom_css,sms_sender_id,custom_domain,is_white_labeled) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(school_id) DO UPDATE SET primary_color=$2,secondary_color=$3,accent_color=$4,logo_url=$5,favicon_url=$6,banner_url=$7,footer_text=$8,custom_css=$9,sms_sender_id=$10,custom_domain=$11,is_white_labeled=$12,updated_at=NOW() RETURNING *`,[req.schoolId,primaryColor||'#2b7fff',secondaryColor||'#1a1a2e',accentColor||'#0ecb81',logoUrl,faviconUrl,bannerUrl,footerText,customCss,smsSenderId||'ELIMU',customDomain,isWhiteLabeled||false]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getPublicBranding = async (req,res) => {
  try {
    const {schoolId}=req.params;
    const {rows}=await query(`SELECT sb.primary_color,sb.secondary_color,sb.accent_color,sb.logo_url,sb.favicon_url,sb.footer_text,sb.custom_css,s.name AS school_name FROM school_branding sb JOIN schools s ON sb.school_id=s.id WHERE sb.school_id=$1`,[schoolId]);
    res.json(rows[0]||{});
  } catch(e){res.status(500).json({error:e.message});}
};
