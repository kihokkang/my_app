// import modules
var express = require('express');   // npm dependency 추가된 'express' 모듈을 쓰겠다라는 의미
var path = require('path');         // root 폴더의 path경로를 잡아줌
var app = express();                // app이라는 변수에 express 모듈 선언
var mongoose = require('mongoose'); // Mongoose 모듈 사용
var passport = require('passport'); // 계정관리를 할때 쓰이는 package
var session = require('express-session');   // 로그인 여부판단 및 유저별 데이터 관리
var flash = require('connect-flash');   // session에 자료를 flash로 저장하게 해주는 package(한번 읽어오면 지워짐)
var async = require('async');   // 비동기식 호출
var bodyParser = require('body-parser');
var methodOverride = require('method-override'); // 대부분의 브라우져들이 보안을 문제로 post를 제외한 나머지 신호들을 차단한다는 것입니다. 이를 우회하기 위한 package.
var bcrypt = require('bcrypt-nodejs');

// connect database
mongoose.connect(process.env.MONGO_DB);  // Mongoose를 데이터베이스에 연결
var db = mongoose.connection;   // 데이터베이스 정보를 담고있는 오브젝트
db.once("open", function(){
    console.log("DB Connected!");
});
db.on("error", function(err){
    console.log("DB ERROR :", err);
});

// model setting
var postSchema = mongoose.Schema({
    title: {type:String, required:true},
    body: {type:String, required:true},
    createdAt: {type:Date, default:Date.now},
    updatedAt: Date
});
var Post = mongoose.model('post', postSchema);

var userSchema = mongoose.Schema({
    email: {type:String, required:true, unique:true}, // unique 속성이 있는 경우 data 생성, 수정시에 동일한 값의 자료가 있으면 에러를 보냄
    nickname: {type:String, required:true, unique:true},
    password: {type:String, required:true},
    createdAt: {type:Date, default:Date.now}
});
userSchema.pre("save", function(next){  // User 모델이 "save"되기전(pre)에 모델에 대해서 할 일을 스카마에 저장하는 단계
    var user = this;
    if(!user.isModified("password")){
        return next();
    }else{
        user.password = bcrypt.hashSync(user.password);
        return next();
    }
});
userSchema.methods.authenticate = function (password) {
    var user = this;
    return bcrypt.compareSync(password,user.password);  // bcrypt.compareSync함수를 사용해서 입력된 password와 db의 hash(user.password)를 비교합니다.
};
userSchema.methods.hash = function (password) {
    return bcrypt.hashSync(password);
};
// Sync가 들어가 있으므로 동기식 함수라는 것을 알 수 있습니다. 이 함수는 hash가 일치하면 true, 일치하지 않으면 false를 return합니다.
var User = mongoose.model('user', userSchema);

// view setiing
app.set("view engine", 'ejs');      // express에게 views 폴더를 default로 ejs파일을 찾아 열음


// set middlewares
app.use(express.static(path.join(__dirname, 'public')));    // public이라는 폴더명을 사용하겠다
app.use(bodyParser.json()); // 모든 서버에 도착하는 신호들의 body를 JSON으로 분석
app.use(bodyParser.urlencoded({extended:true})); // 웹 사이트가 JSON으로 데이터를 전송 할 경우 받는 body parser.
app.use(methodOverride("_method"));

app.use(session({secret:'MySecret'}));  // 로그인 유지:secret은 session을 암호화 할떄 쓰이는 hash key값
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.serializeUser(function(user, done){    // session 생성 시에 어떠한 정보를 저장할지를 설정
    done(null, user.id);    // user.id를 session에 저장  (이때 id는 db의 id임.)
});
passport.deserializeUser(function(id, done){    // session으로 부터 개체를 가져올 때 어떻게 가져올 지를 설정 
    User.findById(id, function(err, user){  // id를 넘겨받아 DB에서 user를 찾고, user를 가져오게함
        done(err, user);
    });
});

var LocalStrategy = require('passport-local').Strategy; // Local Strategy를 package로 부터 가져옴
passport.use('local-login', // strategy에 이름 지어주기
    new LocalStrategy({ // local-login 설정하기
        usernameField : 'email',    // default로 username과 password를 찾아 읽는다
        passwordField : 'password',
        passReqToCallback : true
        },
        function(req, email, password, done) {  //  실질적으로 어떻게 유저를 특정할지에 대한 함수 설정
            User.findOne({  'email' :   email}, function(err, user){
                if (err) return done(err);

                if(!user){  // 유저를 찾고 없으면 flash 에러 메세지 발생
                    req.flash("email", req.body.email);
                    return done(null, false, req.flash('loginError', 'No user found.'));
                }
                if(!user.authenticate(password)){  // 비밀번호 매치되는지 확인
                    req.flash("email", req.body.email);
                    return done(null, false, req.flash('loginError', 'Password does not match.'));
                }
                return done(null, user);    // 모두 통과하면 user 객체를 내보냄.
            });
        }
    )
);

// set home routes
app.get('/', function(req,res){ // 자등으로 게시판으로 이동
    res.redirect('/posts');
});

app.get('/login', function(req,res){    // login form이 있는 view를 불러오는 route
    res.render('login/login',{email:req.flash("email")[0], loginError:req.flash('loginError')});
});

app.post('/login',  // login form에서 받은 정보로 로그인을 실행하는 부분
    function (req,res,next){
        req.flash("email"); // 혹시라도 남아 있을지 모르는 flash 이메일을 지움
        if(req.body.email.length === 0 || req.body.password.length === 0){   // form에 정보들이 있는지를 확인해서 없으면
            req.flash("email", req.body.email);                             // 에러메세지와 함께 다시 login 페이지로 redirect함
            req.flash("loginError","Please enter both email and password.");
            res.redirect('/login');
        }else{
            next(); // 이상이 없으면 next()함수 실행
        }
    }, passport.authenticate('local-login', {
        successRedirect : '/posts', // 이상이 없을경우
        failureRedirect : '/login', // 이상이 있을경우
        failureFlash    : true
    })
);

app.get('/logout', function(req, res){  // 로그아웃
    req.logout();
    res.redirect('/');
});

// set user routes
// new
app.get('/users/new', function(req,res){    // user 생성 view를 보여주는 route
    res.render('users/new', {
                                formData: req.flash('formData')[0], // invalid한 정보가 서버로 전달되면 다시 form으로 재전달
                                emailError: req.flash('emailError')[0],
                                nicknameError: req.flash('nicknameError')[0],
                                passwordError: req.flash('passwordError')[0]
                            }
    );
});

// create
app.post('/users', checkUserRegValidation, function(req,res,next){  // user 생성
    User.create(req.body.user, function(err,user){
        if(err) return res.json({success:false, message:err});
        res.redirect('/login');
    });
});

// show
app.get('/users/:id', isLoggedIn, function(req,res){    // user의 profile을 보여주기 위한 route.
    User.findById(req.params.id, function(err,user){
        if(err) return res.json({success:false, message:err});
        res.render("users/show", {user: user});
    });
});

// edit
app.get('/users/:id/edit', isLoggedIn, function(req,res){   
    User.findById(req.params.id, function(err,user){
        if(err) return res.json({success:false, message:err});
        res.render('users/edit', {
                                    user: user,
                                    formData: req.flash('formData')[0], 
                                    emailError: req.flash('emailError')[0],
                                    nicknameError: req.flash('nicknameError')[0],
                                    passwordError: req.flash('passwordError')[0]
                                 }
        );
    });
});

// update
app.put('/users/:id', isLoggedIn, checkUserRegValidation, function(req,res){
    if(req.user._id != req.params.id) return res.json({success:false, message:"Unauthrized Attempt"});
    User.findById(req.params.id, req.body.user, function (err,user) {
      if(err) return res.json({success:"false", message:err});
      if(user.authenticate(req.body.user.password)){
        if(req.body.user.newPassword){
          req.body.user.password = user.hash(req.body.user.newPassword);
        } else {
          delete req.body.user.password;
        }
        User.findByIdAndUpdate(req.params.id, req.body.user, function (err,user) {
          if(err) return res.json({success:"false", message:err});
          res.redirect('/users/'+req.params.id);
        });
      } else {
        req.flash("formData", req.body.user);
        req.flash("passwordError", "- Invalid password");
        res.redirect('/users/'+req.params.id+"/edit");
      }
    });
  });

// set routes
/*
GET신호로 /posts 에 접속하는 경우, 게시글(Post)데이터의 모든 데이터를 찾고(Post.find()에 
빈 객체를 전달하는 경우) 에러가 있으면 에러를 response하고(이때 success는 false), 
에러가 없다면 모든 게시글(posts)를 response합니다.(이때 success는 true)
*/
// index
app.get('/posts', function (req,res) {  // Get신호로 /posts에 접속하는경우,
    /*
    늦게 작성된 데이터가 위쪽으로 오기 하기 위해 sort를 하는 명령줄입니다. 
    find에서 바로 callback 함수가 호출되지 않고,
    find으로 찾고, sort로 자료를 정렬하고, 그 담에 exec로 함수를 수정하는 형태입니다.
    -createdAt의 '-'는 역방향으로 정렬을 하기 때문에 사용되었습니다. 
    그냥 'createdAt'으로 하면 처음 생성된 자료가 배열의 앞쪽으로 정렬됩니다.
    */ 
    Post.find({}).sort('-createdAt').exec(function (err,posts){
    if(err) return res.json({success:false, message:err});
    /*
    post/index파일을 html로 render합니다.
    (확장자는 안적어도 됩니다. 이미 EJS를 우리의 view file로 설정을 했기 때문이죠)
    */
    res.render("posts/index", {data:posts, user:req.user}); 
    });
});

// new
app.get('/posts/new', function(req,res){
    res.render("posts/new"); // 데이터가 서버로 전송이 되면 create 루트로 이동
});

/*
POST신호로 /posts 에 접속하는 경우, 요청신호의 body의 post항목(req.body.post)로
데이터를 생성(Post.create())하고 에러가 있으면 에러를 response하고(이때 success는 false), 
에러가 없다면 새 게시글(post)를 response합니다.(이때 success는 true)
*/
// create
app.post('/posts', function (req,res) { 
    console.log(req.body); 
    Post.create(req.body.post, function(err,post){
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts'); // 데이터 생성후 게시판 처음으로 이동
    });
});

/*
GET신호로 /posts/:id 에 접속하는 경우, 아이디가 :id인 게시글(Post)의 데이터를 하나 찾고(Post.findById(req.params.id). 
이 명령어는 Post.findOne({_id:req.params.id)와 동일) 에러가 있으면 
에러를 response하고(이때 success는 false), 에러가 없다면 해당 게시글(post)를 response합니다.
(이때 success는 true)
*/
// show
app.get('/posts/:id', function (req,res) {
    Post.findById(req.params.id, function(err, post){
    if(err) return res.json({success:false, message:err});
    res.render("posts/show", {data:post});
    });
});

/*
edit은 단순히 view만 있는 것이 아니라 기존의 데이터를 가져와서 수정전의 자료를 보여줘야 합니다. 
그래서 기본적으로 show페이지와 같습니다.
다만 데이터들이 new의 form에 들어가 있는 형태이지요.
*/
// edit
app.get('/posts/:id/edit', function (req,res) {
    Post.findById(req.params.id, function(err, post){
    if(err) return res.json({success:false, message:err});
    res.render("posts/edit", {data:post});
    });
});

/*
PUT신호로 /posts/:id 에 접속하는 경우, 아이디가 :id인 게시글(Post)의 데이터를 하나 찾고
req.body.post로 데이터를 업데이트 합니다.(Post.findByIdAndUpdate(req.params.id, req.body.post)) 
이때 글 수정 시간이 req.body.post에 삽입됩니다. 에러가 있으면 에러를 response하고
(이때 success는 false), 에러가 없다면 해당 updated 메세지를 response합니다.(이때 success는 true)
*/
// update
app.put('/posts/:id', function (req,res) {
    req.body.post.updatedAt=Date.now();
    Post.findByIdAndUpdate(req.params.id, req.body.post, function(err, post){
        if(err) return res.json({success:false, message:err});
        res.redirect('/posts/'+req.params.id);
    });
});

/* 
DELETE신호로 /posts/:id 에 접속하는 경우, 아이디가 :id인 게시글(Post)의 데이터를 하나 찾아서 지워버립니다.
(Post.findByIdAndRemove(req.params.id)) 에러가 있으면 에러를 response하고(이때 success는 false), 
에러가 없다면 해당 deleted 메세지를 response합니다.(이때 success는 true)
*/
// destroy
app.delete('/posts/:id', function (req,res) {
    Post.findByIdAndRemove(req.params.id, function(err, post){
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts');
    });
});

// functions
function isLoggedIn(req, res, next){    // 현재 로그인이 되어있는지 아닌지 여부 판단하는 함수
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/');
}

function checkUserRegValidation(req, res, next){
    var isValid = true;
    /*
    아이디가 같은 경우를 찾을때는 단순히 id:req.params.id를 사용하면 됐는데,
    이는 mongoose에서 string인 id를 id object로 변환해 주기 때문입니다. 
    DB에서 data들을 살펴보면 사실 id는 단순히 string이 아니라 object임을 알 수 있습니다. 
    하지만 $ne를 쓰는 경우에는 mongoose가 자동으로 object로 변환을 안해주는지, 제대로 검색을 안해주더라구요. 그래서 생성자를 이용해서 object를 만들었습니다.
    */
    async.waterfall(    // 비동기함수들을 동기 함수처럼 사용하게함
        [function(callback){    // 두개의 함수는 []안에 배열로 들어감, 마지막 함수는 마지막에 실행되거나 중간에 오류가 있을때 실행되는 함수
            User.findOne({email: req.body.user.email, _id: {$ne: mongoose.Types.ObjectId(req.params.id)}},  // 유저를 생성, 업데이트 하기 전에 DB에 같은 값의 email, nickname을 살펴보기 위한 함수
                function(err,user){                         // {$ne: ~~~~} 는 !=의 의미를 가진다. 
                    if(user){
                        isValid = false;
                        req.flash("emailError","- This email is already registered.");
                    }
                    callback(null, isValid);    // 배열 안의 함수들은 항상 마지막 parameter로 callback을 가짐
                    // callback 함수를 호출하면 다음번 함수가 호출이 되고, 여기에 다음 함수에 전달할 값을 넣을수 있다.
                    // 여기서는 isValid 하나만 전달
                }
            );
        }, function(isValid, callback){
            User.findOne({nickname: req.body.user.nickname, _id: {$ne: mongoose.Types.ObjectId(req.params.id)}},
                function(err,user){
                    if(user){
                        isValid = false;
                        req.flash("nicknameError","- This nickname is already resistered.");
                    }
                    callback(null, isValid);
                }
            );
        }], function(err, isValid){
            if(err) return res.json({succcess:"false", message:err});
            if(isValid){
                return next();
            }else{
                req.flash("formData",req.body.user);
                res.redirect("back");
            }
        }
    );
}

// start server
app.listen(3000, function(){    // '3000' 포트를 쓰고 function()을 default로 로딩
    console.log('Server On!');
});