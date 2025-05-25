from django.shortcuts import render, redirect
from django.views import View
from . import forms
import db
import bson
from django.http import HttpResponse, HttpRequest

class HomeView(View):
    def get(self, request:HttpRequest):
        # Retrive the delicious session_id cookie
        session_id = request.COOKIES.get("session_id", None)
        if not session_id:  # there is no active connection then
            return redirect("users:login")
        else:
            # Fetch the user
            user = db.get_user_by_session_id(session_id)
            # the user might not exist or the session is any longer active: we have to check for it then
            if not user:
                response = redirect("users:login")
                # As the client to discard this session: we no longer need it since it is expired
                response.delete_cookie("session_id")
                return response
            
            """ Djnago templates do not like obejct's attribute that start with a underscore '_'.
                So, we have to turn 'user._id' into 'user.id'. Also, _id is of type bson.ObjectId, and we want it to be a string once in the template."""
            user["id"] = user["_id"]

            # Build a querying pipeleine for posts retrieval: Note that we want to retreve the user's posts with the comments
            # embedded in each post
            pipeline = [
                { "$match": {"author": user["_id"]} },
                {"$sort": {"date": -1}},
                { "$lookup":{
                    "from": "comments",
                    "let": {"post_id": "$_id"},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$post", "$$post_id"]}}},
                        {"$sort": {"date": -1}},
                    ],
                    "as": "comments",
                }}
            ]

            # Fetch all the posts of the user
            posts = list(db.db.posts.aggregate(pipeline)) # We going to iterate 'posts' and 'posts.comments' in the template: we need a iterable then, not a cursor object from Mongo

            for post in posts:
                post["id"] = str(post["_id"])
                post["comments"] = list(post["comments"])  # In the same way, we need 'posts.comments' as an iterable in the template
            
            # Retrive all the stories from the database: note that at this stage, we only need the story id
            pipeline = [
                {"$match": {"author": user["_id"]}},
                {"$sort": {"date": -1}},
                {"$project": {"_id":1, "id": "$_id"}},
            ]
            stories = db.db.stories.aggregate(pipeline).to_list() # We will need an iterable in the template
            return render(request, "home.html", {"user": user, "posts": posts, "stories": stories})  
    
class ExploreView(View):
    def get(self, request:HttpRequest):
        # Retrive the delicious session_id cookie
        session_id = request.COOKIES.get("session_id", None)
        if not session_id:  # there is no active connection then
            return redirect("users:login")
        else:
            # Fetch the user
            user = db.get_user_by_session_id(session_id)
            # the user might not exist or the session is any longer active: we have to check for it then
            if not user:
                response = redirect("users:login")
                # Ask the client to discard this session: we no longer need it since it is expired
                response.delete_cookie("session_id")
                return response
            
            """ Djnago templates do not like obejct's attribute that start with a underscore '_'.
                So, we have to turn 'user._id' into 'user.id'. Also, _id is of type bson.ObjectId, and we want it to be a string once in the template."""
            user["id"] = user["_id"]

            # Build a querying pipeleine for posts retrieval: we want to retrieve the most recent post along with their comments
            pipeline = [
                { "$match": {} },
                {"$sort": {"date": -1}},
                { "$lookup":{
                    "from": "comments",
                    "let": {"post_id": "$_id"},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$post", "$$post_id"]}}},
                        {"$sort": {"date": -1}},
                    ],
                    "as": "comments",
                }},
                {"$lookup": {
                    "from": "users",
                    "let": {"author": "$author"},
                    'pipeline': [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$author"]}}},
                        {"$project": {'id': 0, 'id': '$_id', 'first_name': 1, 'last_name': 1}},
                    ],
                    'as': 'author',
                }},
            ]

            # Fetch all the posts of the user
            posts = list(db.db.posts.aggregate(pipeline)) # We going to iterate 'posts' and 'posts.comments' in the template: we need a iterable then, not a cursor object from Mongo

            for post in posts:
                post["id"] = str(post["_id"])
                post["comments"] = list(post["comments"])  # In the same way, we need 'posts.comments' as an iterable in the template
            
            # Retrive all the stories from the database: note that at this stage, we only need the story id
            pipeline = [
                {"$match": {}},
                {"$sort": {"date": -1}},
                {"$lookup": {
                    "from": "users",
                    "let": {"author": "$author"},
                    'pipeline': [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$author"]}}},
                        {"$project": {'id': 0, 'id': '$_id', 'first_name': 1, 'last_name': 1}},
                    ],
                    'as': 'author',
                }},
                {"$project": {"_id":0, "id": "$_id", 'author': 1}},
            ]
            stories = db.db.stories.aggregate(pipeline).to_list() # We will need an iterable in the template

            print('========================')
            print(posts[0]['content'])
            print('========================')
            return render(request, "explore.html", {"user": user, "posts": posts, "stories": stories})  
    

class LoginView(View):
    def get(self, request):
        return render(request, "users/login.html")
    
    def post(self, request):
        form = forms.LoginForm(request.POST)
        if form.is_valid():
            session_id = db.login(form.cleaned_data.get("username"), form.cleaned_data.get("password"))
            if session_id:
                response = redirect("users:home", permanent=True)
                response.set_cookie(  # save the session_id as cookie and send it to the server: I like cookies 😁!
                    key="session_id",
                    value=session_id,
                    path="/",
                    httponly=True,
                    secure=False,
                    samesite="strict"
                )
                return response
        return redirect("users:register")
    
class LogoutView(View):
    def get(self, request):
        db.remove_session(request.COOKIES.get("session_id", None))
        response = redirect("users:login")
        response.delete_cookie("session_id")
        return response
    
class RegisterView(View):
    def get(self, request):
        return render(request, "users/register.html")
            
    def post(self, request):
        form = forms.RegistrationForm(request.POST)
        default_avatar = open("static/images/default.jpg", "rb").read()
        default_avatar_format = "jpg"
        if form.is_valid():
            db.register(
                form.cleaned_data.get("firstname"),
                form.cleaned_data.get("lastname"),
                form.cleaned_data.get("username"),
                form.cleaned_data.get("password"),
                default_avatar,
                default_avatar_format,
            )
            return redirect("users:login")
        else:
            print("{")
            for key, value in form.errors.items():
                print(f"\t{key}: {value},")
            print("}")
            return redirect("users:register")

class AvatarView(View):
    def get(self, request, id:str):
        user = db.db.users.find_one({"_id": bson.ObjectId(id)})
        img_bytes = bytes(user["avatar"])
        content_type = f"image/{user["avatar_format"]}"
        return HttpResponse(content=img_bytes, content_type=content_type)