export const isAuthenticated = (req, res, next)  => {
    console.log(req.session.userId)
    if (req.session.userId) {
        req.userId=req.session.userId;
        next();
    }
    else {
        // console.log("여기들어와짐");
        res.status(401).json({ status:401, message: 'Un_authorized' });
    }
  }