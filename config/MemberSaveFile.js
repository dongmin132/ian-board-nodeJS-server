import fs from 'fs';
export const memberSaveFile = (memberJsonFile) => {
    // memberFile을 JSON.stringify()를 사용하여 JSON 문자열로 변환

    // JSON 문자열을 members.json 파일에 쓰기
    const memberJson = JSON.stringify(memberJsonFile, null, 2);
    fs.writeFile('./models/members.js', 'export const members =' + memberJson, (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('JSON file has been saved.');
        }
    });
};
