import express from 'express';
import { getBoard,createBoarad,getBoardWithComment, getBoardsWithMember, updateBoard, deleteBoard } from '../controllers/boardController.js';
import { getComments, createComment, updateComment, deleteComment } from '../controllers/commentController.js'
import { isAuthenticated } from '../config/isAuthentication.js';
const router = express.Router();


router.get('/',getBoardsWithMember);

router.post('/',isAuthenticated,createBoarad);

router.get('/:boardId',isAuthenticated,getBoardWithComment);

router.get('/:boardId/board',getBoard);

router.put('/:boardId',isAuthenticated,updateBoard);

router.delete('/:boardId',isAuthenticated,deleteBoard);

//--------------- commentController ---------------

router.get('/:boardId/comments', isAuthenticated,getComments);

router.post('/:boardId/comments', isAuthenticated,createComment);

router.patch('/:boardId/comments/:commentId', isAuthenticated,updateComment);

router.delete('/:boardId/comments/:commentId', isAuthenticated,deleteComment);

export default router;