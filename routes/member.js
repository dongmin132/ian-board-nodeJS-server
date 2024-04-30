import express from 'express';
import { isAuthenticated } from '../config/isAuthentication.js';
import {login,register, getMember,memberUpdate,checkEmail,checkNickname,memberDelete, memberPassword, logout} from '../controllers/memberController.js';
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

router.get('/logout',logout);

router.post('/register',register);

router.get('/getMember',isAuthenticated,getMember);

router.patch('/',isAuthenticated,memberUpdate);

router.patch('/password',isAuthenticated,memberPassword);

router.post('/check-email',checkEmail);

router.post('/checkNickname',checkNickname);

router.delete('/',isAuthenticated,memberDelete);



export default router;