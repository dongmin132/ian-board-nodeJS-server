import fs from 'fs';
const imgDelete = (imagePath) => {
    if (fs.existsSync('.' + imagePath)) {
        fs.unlink('.' + imagePath, (err) => {
            if (err) {
                console.log('Error deleting image file: ', err);
            } else {
                console.log("이미지가 성공적으로 지워짐: ", imagePath);
            }
        })
    } else {
        console.log("파일이 없음");
    }
}