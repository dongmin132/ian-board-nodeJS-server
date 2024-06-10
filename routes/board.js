import express from 'express';
import { createBoarad, getBoardsWithMember, getBoardWithMemberWithComments,updateBoard, deleteBoard, incrementView } from '../controllers/boardController.js';
import { createComment, updateComment, deleteComment } from '../controllers/commentController.js'
import { isAuthenticated, isAuthenticatedBoards } from '../config/isAuthentication.js';
const router = express.Router();


router.get('/',getBoardsWithMember);

router.post('/',isAuthenticated,createBoarad);

router.post('/:boardId/views',incrementView);

router.get('/:boardId',isAuthenticatedBoards,getBoardWithMemberWithComments);

router.put('/:boardId',isAuthenticated,updateBoard);

router.delete('/:boardId',isAuthenticated,deleteBoard);

//--------------- commentController ---------------

// router.get('/:boardId/comments', isAuthenticatedBoards,getComments);

router.post('/:boardId/comments', isAuthenticated,createComment);

router.patch('/:boardId/comments/:commentId', isAuthenticated,updateComment);

router.delete('/:boardId/comments/:commentId', isAuthenticated,deleteComment);

export default router;