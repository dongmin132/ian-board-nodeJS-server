export const isAuthenticated = (req, res, next)  => {
    if (req.session.userId) {
        req.userId=req.session.userId;
        next();
    }
    else {
        res.status(401).json({ status:401, message: 'Un_authorized' });
    }
  }

  export const isAuthenticatedBoards = (req, res, next)  => {

    if (req.session.userId) {
        req.userId=req.session.userId;
        next();
    }
    else {
        next();
    }
  }