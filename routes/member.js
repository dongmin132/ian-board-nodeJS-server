import express from 'express';
import {login,register, getMember,memberUpdate,checkEmail,checkNickname} from '../controllers/memberController.js';
// import path from 'path';

// import multer from 'multer';
// const storage = multer.diskStorage({
//     destination: 'img/',
//     filename: function (req, file, cb) {
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//       const ext = path.extname(file.originalname);
//       cb(null, uniqueSuffix + ext);
//     }
//   });
//   const upload = multer({ storage: storage });

const router = express.Router();

router.post('/login',login);

router.post('/register',register);

router.get('/:memberId/getMember',getMember);

router.patch('/:memberId',memberUpdate);

router.post('/check-email',checkEmail);

router.post('/checkNickname',checkNickname);

export default router;