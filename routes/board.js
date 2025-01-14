import express from 'express';
import { createBoarad, getBoardsWithMember, getBoardWithMemberWithComments,updateBoard, deleteBoard, incrementView, postLike, getSse, patchNoti } from '../controllers/boardController.js';
import { createComment, updateComment, deleteComment } from '../controllers/commentController.js'
import { isAuthenticated, isAuthenticatedBoards } from '../config/isAuthentication.js';
const router = express.Router();


router.get('/',isAuthenticatedBoards,getBoardsWithMember);

router.post('/',isAuthenticated,createBoarad);

router.post('/:boardId/views',incrementView);

// router.get('/:boardId/likes',isAuthenticated,checkLike);

router.post('/:boardId/likes', isAuthenticated,postLike);

router.get('/sse',isAuthenticated,getSse);

router.get('/:boardId',isAuthenticatedBoards,getBoardWithMemberWithComments);

router.put('/:boardId',isAuthenticated,updateBoard);

router.delete('/:boardId',isAuthenticated,deleteBoard);

router.patch('/noti',isAuthenticated,patchNoti);


//--------------- commentController ---------------

// router.get('/:boardId/comments', isAuthenticatedBoards,getComments);

router.post('/:boardId/comments', isAuthenticated,createComment);

router.patch('/:boardId/comments/:commentId', isAuthenticated,updateComment);

router.delete('/:boardId/comments/:commentId', isAuthenticated,deleteComment);

export default router;