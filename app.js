var express = require('express');   // npm dependency 추가된 'express' 모듈을 쓰겠다라는 의미
var path = require('path');         // root 폴더의 path경로를 잡아줌
var app = express();                // app이라는 변수에 express 라이브러리를 선언
var mongoose = require('mongoose'); // Mongoose 모듈 사용

mongoose.connect(process.env.MONGO_DB);  // Mongoose를 데이터베이스에 연결
var db = mongoose.connection;   // 데이터베이스 정보를 담고있는 오브젝트
db.once("open", function(){
    console.log("DB Connected!");
});
db.on("error", function(err){
    console.log("DB ERROR :", err);
});

var dataSchema = mongoose.Schema({  // mongoose.Scheme()함수는 object를 인자로 받아 그 object 스키마를 만듬
    name:String,    // 이름:타입
    count:Number
});

/*
모델을 담는 변수는 첫글자가 대문자
mongoose.model()함수는 두개의 인자를 받는데, 첫번째 인자는 문자열로 데이터베이스에 연결될 collection의
단수 이름이고, 두번째 인자는 스키마 변수
*/
var Data = mongoose.model('data',dataSchema);
Data.findOne({name:"myData"}, function(err,data){
    if(err) return console.log("Data ERROR:", err);
    if(!data){
        Data.create({name:"myData", count:0}, function(err,data){
            if(err) return console.log("Data ERROR:", err);
            console.log("Counter initialized :",data);
        });
    }
});

app.set("view engine", 'ejs');      // express에게 views 폴더를 default로 ejs파일을 찾아 열음
app.use(express.static(path.join(__dirname, 'public')));    // public이라는 폴더명을 사용하겠다

app.get('/', function (req,res) {   // '/' 루트를 생성하고 루트에 get 신호가 오면 my_first_ejs 파일을 렌더링
    Data.findOne({name:"myData"}, function(err,data){   // 이름이 myData인 데이터를 찾는다
        if(err) return console.log("Data ERROR:", err);
        data.count++;
        data.save(function (err){   // Save()를 사용하여 그 값을 데이터베이스에 업데이트
            if(err) return console.log("Data ERROR:", err);
            res.render('my_first_ejs',data);
        });
    });
});
app.get('/reset', function (req,res) {  // '/reset' 루트에 get 신호가 오면 data 오브젝트의 count값을 0으로 바꾸고 렌터
    setCounter(res,0);
});
app.get('/set/count', function (req,res) {
    if(req.query.count) setCounter(res, req.query.count); // req에 count query가 있는지 확인하고 있다면 data.count에 대입
    else getCounter(res);
});
app.get('/set/:num', function (req,res) {
    if(req.params.num) setCounter(res, req.params.num);
    else getCounter(res);
});

function setCounter(res, num){
    console.log("setCounter");
    Data.findOne({name:"myData"}, function(err,data){   
        if(err) return console.log("Data ERROR:", err);
        data.count=num;
        data.save(function (err){   
            if(err) return console.log("Data ERROR:", err);
            res.render('my_first_ejs',data);
        });
    });
}

function getCounter(res){
    console.log("getCounter");
    Data.findOne({name:"myData"}, function(err,data){   // 이름이 myData인 데이터를 찾는다
        if(err) return console.log("Data ERROR:", err);
        res.render('my_first_ejs',data);
    });
}

app.listen(3000, function(){    // '3000' 포트를 쓰고 function()을 default로 로딩
    console.log('Server On!');
});