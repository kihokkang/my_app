var express = require('express');   // npm dependency 추가된 'express' 모듈을 쓰겠다라는 의미
var path = require('path');         // root 폴더의 path경로를 잡아줌
var app = express();                // app이라는 변수에 express 라이브러리를 선언

app.set("view engine", 'ejs');      // express에게 views 폴더를 default로 ejs파일을 찾아 열음
app.use(express.static(path.join(__dirname, 'public')));    // public이라는 폴더명을 사용하겠다

var data={count:0}; // 해당 변수는 서버에 저장이되며, 서버가 종료될때까지 그 값을 유지함
app.get('/', function (req,res) {   // '/' 루트를 생성하고 루트에 get 신호가 오면 my_first_ejs 파일을 렌더링
    data.count++;
    res.render('my_first_ejs',data);
});
app.get('/reset', function (req,res) {  // '/reset' 루트에 get 신호가 오면 data 오브젝트의 count값을 0으로 바꾸고 렌터
    data.count=0;
    res.render('my_first_ejs',data);
});
app.get('/set/count', function (req,res) {
    if(req.query.count) data.count=req.query.count; // req에 count query가 있는지 확인하고 있다면 data.count에 대입
    res.render('my_first_ejs',data);
});
app.get('/set/:num', function (req,res) {
    data.count=req.params.num;  // :num에는 아무값이나 들어갈수 있으며, 이 값은 req의 param으로 저장
    res.render('my_first_ejs',data);
});

app.listen(3000, function(){    // '3000' 포트를 쓰고 function()을 default로 로딩
    console.log('Server On!');
});