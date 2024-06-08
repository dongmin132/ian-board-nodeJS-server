import express from 'express';
import { getBoard,createBoarad, getBoardsWithMember, getBoardWithMemberWithComments,updateBoard, deleteBoard } from '../controllers/boardController.js';
import { createComment, updateComment, deleteComment } from '../controllers/commentController.js'
import { isAuthenticated, isAuthenticatedBoards } from '../config/isAuthentication.js';
const router = express.Router();


router.get('/',getBoardsWithMember);

router.post('/',isAuthenticated,createBoarad);

// router.get('/:boardId',isAuthenticated,getBoardWithComment);

router.get('/update/:boardId',getBoard);     //어따 쓰는거지...?         updateBoard에서 쓰는거였음

router.get('/:boardId',isAuthenticatedBoards,getBoardWithMemberWithComments);

router.put('/:boardId',isAuthenticated,updateBoard);

router.delete('/:boardId',isAuthenticated,deleteBoard);

//--------------- commentController ---------------

// router.get('/:boardId/comments', isAuthenticatedBoards,getComments);

router.post('/:boardId/comments', isAuthenticated,createComment);

router.patch('/:boardId/comments/:commentId', isAuthenticated,updateComment);

router.delete('/:boardId/comments/:commentId', isAuthenticated,deleteComment);

export default router;