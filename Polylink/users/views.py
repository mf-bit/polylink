from pyexpat.errors import messages
from django.shortcuts import render, redirect
from django.views import View
from . import forms
import db
import bson
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseBadRequest
import bson
from django.http import HttpResponse, HttpRequest, JsonResponse
from django.urls import reverse
from django.http import JsonResponse
from django.contrib.auth import get_user
from Polylink import settings
import os
from datetime import datetime, timezone

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
                { "$sort": {"date": -1}},
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
            posts = list(db.db.posts.aggregate(pipeline))

            for post in posts:
                post["id"] = str(post["_id"])
                post["comments"] = list(post["comments"])
                date:datetime = post['date']
                right_now = datetime.now(timezone.utc)
                if date.day == right_now.day:
                    post['date'] = f'Today ~  {date.hour}:{date.minute}'
                elif (date.day + 1) == right_now.day:
                    post['date'] = f'Yesderday  ~  {date.hour}:{date.minute}'
                else:
                    post['date'] = f'{date.day}/{date.month}/{date.year}  ~  {date.hour}:{date.minute}'
            
            # Retrive all the stories from the database
            pipeline = [
                {"$match": {"author": user["_id"]}},
                {"$sort": {"date": -1}},
                {"$project": {"_id":1, "id": "$_id"}},
            ]

            stories = db.db.stories.aggregate(pipeline).to_list() # We will need an iterable in the template

            # Récupérer les notifications avec pagination
            page = int(request.GET.get('page', 1))
            notifications_data = db.get_user_notifications(user["_id"], page=page)

            # Retrieve the conversations of the user
                # Create a pipeline that extract the converstaions with the infos of the other user inside
            pipeline = [
                {"$match": {"participants": {'$in': [user["_id"]]}}},  # target the conversation concerning the user
                {"$unwind": "$participants"},                           # unwind it for easy process: if you do not know what $unwind do, bro, google it!
                {"$match": {'participants': {'$ne': user['_id']}}},     # select only the document referencing the other user
                {                                                       # incude the info of the other user: we need then for the template rendering
                    '$lookup': {
                        'from': 'users',
                        'let': {'other_user': '$participants'},
                        'pipeline': [
                            {'$match': {"$expr" : {"$eq": ['$_id', '$$other_user']}}},
                            {'$project': {'_id': 0, 'id': '$_id', 'first_name': 1, 'last_name': 1}}
                        ],
                        'as': 'other_user',
                    }
                },
                {
                    '$lookup': {
                        'from': 'messages',
                        'let': {'last_message': '$last_message'},
                        'pipeline': [
                            {'$match': {'$expr': {'$eq': ['$_id', '$$last_message']}}},
                        ],
                        'as': 'last_message',
                    }
                },
                # Django do not accept varaible that start with _ in the tmeplates. So we have to rename it
                # Also, $other_user come as an array after loockup, it only contain one element, so we can re-assign it
                # In the same way, $last_message comes as an array: this is the result after a lookup. We can rewrite it then since it contain only one element
                {'$project': {'_id': 0, 'id': '$_id', 'other_user': {'$arrayElemAt': ['$other_user', 0]}, 'last_message': {'$arrayElemAt': ['$last_message', 0]}}}  
            ]
         
            # conversations = db.db.conversations.find({'participants': {'$in': [bson.ObjectId(user['id'])]}})
            conversations  = list(db.db.conversations.aggregate(pipeline))

            # The base's url to use when to search a user
            search_user_base_url = reverse('users:search', kwargs={'pattern':'_'})
            index_2nd_last_slash = search_user_base_url.rfind('/', 0, len(search_user_base_url) - 1)
            search_user_base_url = search_user_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            # The base's url to use when to start a new conversation
            start_conversation_base_url = reverse('conversations:start-conversation', kwargs={'id':'_'})
            index_2nd_last_slash = start_conversation_base_url.rfind('/', 0, len(start_conversation_base_url) - 1)
            start_conversation_base_url = start_conversation_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            # The base's url to use when to make the user follow another user
            follow_user_base_url = reverse('users:follow', kwargs={'id':'_'})
            index_2nd_last_slash = follow_user_base_url.rfind('/', 0, len(follow_user_base_url) - 1)
            follow_user_base_url = follow_user_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            context = {
                "user": user, 
                "posts": posts, 
                "stories": stories, 
                'conversations': conversations, 
                'search_user_base_url': search_user_base_url,
                'start_conversation_base_url': start_conversation_base_url,
                'follow_user_base_url': follow_user_base_url,
                "notifications": notifications_data["notifications"],
                "unread_notifications_count": notifications_data["unread_count"],
                "has_more_notifications": notifications_data["has_more"],
                "current_page": page
            }

            return render(request, "home.html", context)
    
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
                {"$match": {'author': {'$ne': user["_id"]} } },
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
                        {"$project": {'_id': 1, 'id': '$_id', 'first_name': 1, 'last_name': 1}},
                    ],
                    'as': 'author',
                }},
                # {'$project': {'author': {'$arrayElemAt': ['$author', 0]}}}
            ]

            # Fetch all the posts of the user
            posts = list(db.db.posts.aggregate(pipeline)) # We going to iterate 'posts' and 'posts.comments' in the template: we need a iterable then, not a cursor object from Mongo

            # Format the date of the posts nicely
            for post in posts:
                post["id"] = str(post["_id"])
                post["comments"] = list(post["comments"])  # In the same way, we need 'posts.comments' as an iterable in the template
                date:datetime = post['date']
                right_now = datetime.now(timezone.utc)
                if date.day == right_now.day:
                    post['date'] = f'Today ~  {date.hour}:{date.minute}'
                elif (date.day + 1) == right_now.day:
                    post['date'] = f'Yesderday  ~  {date.hour}:{date.minute}'
                else:
                    post['date'] = f'{date.day}/{date.month}/{date.year}  ~  {date.hour}:{date.minute}'

                # verify if this user follows the author of this post
                if db.db.users.find_one({'$and': [
                    {'_id': user['_id']},
                    {'followings': {'$in': [post['author'][0]['_id']]}},
                ]}):
                    post['followed'] = True
                else: 
                    post['followed'] = False
            # Retrive all the stories from the database: note that at this stage, we only need the story id
            pipeline = [
                {"$match": {'author': {'$ne': user["_id"]} } },
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

            # Récupérer les notifications avec pagination
            page = int(request.GET.get('page', 1))
            notifications_data = db.get_user_notifications(user["_id"], page=page)

            # Retrieve the conversations of the user
                # Create a pipeline that extract the converstaions with the infos of the other user inside
            pipeline = [
                {"$match": {"participants": {'$in': [user["_id"]]}}},  # target the conversation concerning the user
                {"$unwind": "$participants"},                           # unwind it for easy process: if you do not know what $unwind do, bro, google it!
                {"$match": {'participants': {'$ne': user['_id']}}},     # select only the document referencing the other user
                {                                                       # incude the info of the other user: we need then for the template rendering
                    '$lookup': {
                        'from': 'users',
                        'let': {'other_user': '$participants'},
                        'pipeline': [
                            {'$match': {"$expr" : {"$eq": ['$_id', '$$other_user']}}},
                            {'$project': {'_id': 0, 'id': '$_id', 'first_name': 1, 'last_name': 1}}
                        ],
                        'as': 'other_user',
                    }
                },
                {
                    '$lookup': {
                        'from': 'messages',
                        'let': {'last_message': '$last_message'},
                        'pipeline': [
                            {'$match': {'$expr': {'$eq': ['$_id', '$$last_message']}}},
                        ],
                        'as': 'last_message',
                    }
                },
                # Django do not accept varaible that start with _ in the tmeplates. So we have to rename it
                # Also, $other_user come as an array after loockup, it only contain one element, so we can re-assign it
                # In the same way, $last_message comes as an array: this is the result after a lookup. We can rewrite it then since it contain only one element
                {'$project': {'_id': 0, 'id': '$_id', 'other_user': {'$arrayElemAt': ['$other_user', 0]}, 'last_message': {'$arrayElemAt': ['$last_message', 0]}}}  
            ]

            # conversations = db.db.conversations.find({'participants': {'$in': [bson.ObjectId(user['id'])]}})
            conversations  = list(db.db.conversations.aggregate(pipeline))

            # Format the date nicely
            for conversation in conversations:
                date:datetime = conversation['last_message']['date']
                right_now = datetime.now(timezone.utc)
                if date.day == right_now.day:
                    conversation['last_message']['date'] = f'Today ~  {date.hour}:{date.minute}'
                elif (date.day + 1) == right_now.day:
                    conversation['last_message']['date'] = f'Yesderday  ~  {date.hour}:{date.minute}'
                else:
                    conversation['last_message']['date'] = f'{date.day}/{date.month}/{date.year}  ~  {date.hour}:{date.minute}'

            # The base's url to use when to search a user
            search_user_base_url = reverse('users:search', kwargs={'pattern':'_'})
            index_2nd_last_slash = search_user_base_url.rfind('/', 0, len(search_user_base_url) - 1)
            search_user_base_url = search_user_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            # The base's url to use when to start a new conversation
            start_conversation_base_url = reverse('conversations:start-conversation', kwargs={'id':'_'})
            index_2nd_last_slash = start_conversation_base_url.rfind('/', 0, len(start_conversation_base_url) - 1)
            start_conversation_base_url = start_conversation_base_url[0:index_2nd_last_slash + 1]  # We just need the base root
            
            # The base's url to use when to make the user follow another user
            follow_user_base_url = reverse('users:follow', kwargs={'id':'_'})
            index_2nd_last_slash = follow_user_base_url.rfind('/', 0, len(follow_user_base_url) - 1)
            follow_user_base_url = follow_user_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            context = {
                "user": user, 
                "posts": posts, 
                "stories": stories, 
                'conversations': conversations, 
                'search_user_base_url': search_user_base_url,
                'start_conversation_base_url': start_conversation_base_url,
                'follow_user_base_url': follow_user_base_url,
                "notifications": notifications_data["notifications"],
                "unread_notifications_count": notifications_data["unread_count"],
                "has_more_notifications": notifications_data["has_more"],
                "current_page": page
            }

            return render(request, "explore.html", context)
    
class FollowingView(View):
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

            # We will ne to associate each following with its username
            user['following_infos'] = {}
            for x in range(0, len(user['followings'])):
                following_id = user['followings'][x]
                user['following_infos'][following_id] = db.db.users.find_one({'_id': following_id})['username']
            
            # Build a querying pipeleine for posts retrieval: we want to retrieve the most recent post along with their comments
            pipeline = [
                {"$match": {
                    'author': {'$ne': user["_id"]},
                    'author': {'$in': user['followings']}  # """ Regarding pipeleines, this is the only line that deffer this method and the Explore.get()"""
                } },
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
                        {"$project": {'_id': 1, 'id': '$_id', 'first_name': 1, 'last_name': 1}},
                    ],
                    'as': 'author',
                }},
                # {'$project': {'author': {'$arrayElemAt': ['$author', 0]}}}
            ]

            # Fetch all the posts of the user
            posts = list(db.db.posts.aggregate(pipeline)) # We going to iterate 'posts' and 'posts.comments' in the template: we need a iterable then, not a cursor object from Mongo

            # Format the date of the posts nicely
            for post in posts:
                post["id"] = str(post["_id"])
                post["comments"] = list(post["comments"])  # In the same way, we need 'posts.comments' as an iterable in the template
                date:datetime = post['date']
                right_now = datetime.now(timezone.utc)
                if date.day == right_now.day:
                    post['date'] = f'Today ~  {date.hour}:{date.minute}'
                elif (date.day + 1) == right_now.day:
                    post['date'] = f'Yesderday  ~  {date.hour}:{date.minute}'
                else:
                    post['date'] = f'{date.day}/{date.month}/{date.year}  ~  {date.hour}:{date.minute}'

                # verify if this user follows the author of this post
                if db.db.users.find_one({'$and': [
                    {'_id': user['_id']},
                    {'followings': {'$in': [post['author'][0]['_id']]}},
                ]}):
                    post['followed'] = True
                else: 
                    post['followed'] = False
            # Retrive all the stories from the database: note that at this stage, we only need the story id
            pipeline = [
                {"$match": {
                    'author': {'$ne': user["_id"] },
                    'author': {'$in': user['followings'],}  #""" Regarding pipeleines, this is the only line that deffer this method and the Explore.get()"""
                }},
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

            # Récupérer les notifications avec pagination
            page = int(request.GET.get('page', 1))
            notifications_data = db.get_user_notifications(user["_id"], page=page)

            # Retrieve the conversations of the user
                # Create a pipeline that extract the converstaions with the infos of the other user inside
            pipeline = [
                {"$match": {"participants": {'$in': [user["_id"]]}}},  # target the conversation concerning the user
                {"$unwind": "$participants"},                           # unwind it for easy process: if you do not know what $unwind do, bro, google it!
                {"$match": {'participants': {'$ne': user['_id']}}},     # select only the document referencing the other user
                {                                                       # incude the info of the other user: we need then for the template rendering
                    '$lookup': {
                        'from': 'users',
                        'let': {'other_user': '$participants'},
                        'pipeline': [
                            {'$match': {"$expr" : {"$eq": ['$_id', '$$other_user']}}},
                            {'$project': {'_id': 0, 'id': '$_id', 'first_name': 1, 'last_name': 1}}
                        ],
                        'as': 'other_user',
                    }
                },
                {
                    '$lookup': {
                        'from': 'messages',
                        'let': {'last_message': '$last_message'},
                        'pipeline': [
                            {'$match': {'$expr': {'$eq': ['$_id', '$$last_message']}}},
                        ],
                        'as': 'last_message',
                    }
                },
                # Django do not accept varaible that start with _ in the tmeplates. So we have to rename it
                # Also, $other_user come as an array after loockup, it only contain one element, so we can re-assign it
                # In the same way, $last_message comes as an array: this is the result after a lookup. We can rewrite it then since it contain only one element
                {'$project': {'_id': 0, 'id': '$_id', 'other_user': {'$arrayElemAt': ['$other_user', 0]}, 'last_message': {'$arrayElemAt': ['$last_message', 0]}}}  
            ]

            # conversations = db.db.conversations.find({'participants': {'$in': [bson.ObjectId(user['id'])]}})
            conversations  = list(db.db.conversations.aggregate(pipeline))

            # Format the date nicely
            for conversation in conversations:
                date:datetime = conversation['last_message']['date']
                right_now = datetime.now(timezone.utc)
                if date.day == right_now.day:
                    conversation['last_message']['date'] = f'Today ~  {date.hour}:{date.minute}'
                elif (date.day + 1) == right_now.day:
                    conversation['last_message']['date'] = f'Yesderday  ~  {date.hour}:{date.minute}'
                else:
                    conversation['last_message']['date'] = f'{date.day}/{date.month}/{date.year}  ~  {date.hour}:{date.minute}'

            # The base's url to use when to search a user
            search_user_base_url = reverse('users:search', kwargs={'pattern':'_'})
            index_2nd_last_slash = search_user_base_url.rfind('/', 0, len(search_user_base_url) - 1)
            search_user_base_url = search_user_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            # The base's url to use when to start a new conversation
            start_conversation_base_url = reverse('conversations:start-conversation', kwargs={'id':'_'})
            index_2nd_last_slash = start_conversation_base_url.rfind('/', 0, len(start_conversation_base_url) - 1)
            start_conversation_base_url = start_conversation_base_url[0:index_2nd_last_slash + 1]  # We just need the base root
            
            # The base's url to use when to make the user follow another user
            follow_user_base_url = reverse('users:follow', kwargs={'id':'_'})
            index_2nd_last_slash = follow_user_base_url.rfind('/', 0, len(follow_user_base_url) - 1)
            follow_user_base_url = follow_user_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            context = {
                "user": user, 
                "posts": posts, 
                "stories": stories, 
                'conversations': conversations, 
                'search_user_base_url': search_user_base_url,
                'start_conversation_base_url': start_conversation_base_url,
                'follow_user_base_url': follow_user_base_url,
                "notifications": notifications_data["notifications"],
                "unread_notifications_count": notifications_data["unread_count"],
                "has_more_notifications": notifications_data["has_more"],
                "current_page": page
            }

            return render(request, "following.html", context)
    
    def post(self, request, id):
        user_id = db.get_user_id(request)  # the main user triggering the process

        # The user cannot follow itself, but fortunaly there is no way for him to do so. Eraes then 😁
        # Unfortnalym we have to tell the user when he try to follow someone he already does
        if db.db.users.find_one({'$and': [
            {'_id': bson.ObjectId(user_id)},
            {'followings': {'$in': [bson.ObjectId(id)]}}
        ]}):
            return JsonResponse({'error': 'You already follow this guys. Come on man 😒'})
    
        db.db.users.update_one({'_id':bson.ObjectId(user_id)}, {
            '$addToSet': {'followings': bson.ObjectId(id)}
        })
        
        return JsonResponse({})

    def delete(self, request, id):
        user_id = db.get_user_id(request)

        # In the same way as follow, the user cannot unfollow itself, but fortunaly there is no way for him to do so. Eraes then 😁
        # We have to tell the user when he try to unfollow someone he already does
        if not db.db.users.find_one({'$and': [
            {'_id': bson.ObjectId(user_id)},
            {'followings': {'$in': [bson.ObjectId(id)]}}
        ]}):
            return JsonResponse({'error': 'You no longer follow this one'})
    
        db.db.users.update_one({'_id':bson.ObjectId(user_id)}, {
            '$pull': {'followings': bson.ObjectId(id)}
        })
        
        return JsonResponse({})
    
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

        default_path = os.path.join(settings.BASE_DIR, 'static/images/default.jpg')
        default_avatar = open(default_path, "rb").read()
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

class MarkNotificationReadView(View):
    def post(self, request, notification_id):
        user = db.get_user(request)
        if not user:
            return JsonResponse({"success": False, "error": "Non authentifié"}, status=401)

        if db.mark_notification_as_read(notification_id):
            # Récupérer le nouveau compte de notifications non lues
            unread_count = db.db.notifications.count_documents({
                "recipient_id": user["_id"],
                "read": False
            })
            return JsonResponse({
                "success": True,
                "unread_count": unread_count
            })
        return JsonResponse({"success": False, "error": "Notification non trouvée"}, status=404)

class MarkAllNotificationsReadView(View):
    def post(self, request):
        user = db.get_user(request)
        if not user:
            return JsonResponse({"success": False, "error": "Non authentifié"}, status=401)

        marked_count = db.mark_all_notifications_as_read(user["_id"])
        return JsonResponse({
            "success": True,
            "marked_count": marked_count,
            "unread_count": 0
        })

class GetNotificationPreviewView(View):
    def get(self, request, notification_id):
        user = db.get_user(request)
        if not user:
            return JsonResponse({"success": False, "error": "Non authentifié"}, status=401)

        preview = db.get_notification_preview(notification_id)
        if preview:
            return JsonResponse({"success": True, "data": preview})
        return JsonResponse({"success": False, "error": "Notification ou post non trouvé"}, status=404)
    
class SearchView(View):
    def get(self, request, pattern):
        # Retreive the user that make the request
        main_user = db.get_user(request)
        users = list(db.db.users.find({
           '$and': [
                {'$or': [
                    {"username": {'$regex': f"^{pattern}", '$options': "i" }},
                    {"first_name": {'$regex': f"^{pattern}", '$options': "i" }},
                    {"last_name": {'$regex': f"^{pattern}", '$options': "i" }},
                    {"phone number": {'$regex': f"^{pattern}", '$options': "i" }},
                ]},
                {"_id": {'$ne': main_user['_id']}},
           ]
        }, {'_id': 0, 'id': '$_id', 'first_name': 1, 'last_name': 1, 'username': 1}))

        # The front do just need the username, the first_name, the last_name and the location of the avatar (url): we have all but
        # not the last one
        for user in users:
            # Check the state: if this user if followed or not
            user['followed'] = bool( db.db.users.find_one({'$and': [ {'_id': main_user['_id']}, {'followings': {'$in': [user['id']]}},]}) )
            print(f'===============\n{user['followed']}\n===============')
            user['id'] = str(user['id'])
            user['avatar_url'] = reverse('users:avatar', kwargs={'id':user['id']})
        # Handle the case where nothing is found
        if not users:
            users = []

        response = JsonResponse(data=users, safe=False)
        return response
 
class ProfileView(View):
    def get(self, request: HttpRequest, id: str):
        session_id = request.COOKIES.get("session_id")
        if not session_id:
            return redirect("users:login")

        # Récupération de l'utilisateur via la session
        user = db.get_user_by_session_id(session_id)
        if not user:
            response = redirect("users:login")
            response.delete_cookie("session_id")
            return response

        # Vérifier si l'ID dans l'URL correspond à l'utilisateur connecté
        if str(user["_id"]) != id:
            # Rediriger ou afficher une erreur si l'ID ne correspond pas
            return redirect("users:home")  # Ou une page d'erreur/message

        user["id"] = str(user["_id"])  # Conversion pour Django template
        return render(request, "profile.html", {"user": user})

    def post(self, request: HttpRequest, id: str):
        session_id = request.COOKIES.get("session_id")
        if not session_id:
            return redirect("users:login")

        user = db.get_user_by_session_id(session_id)
        if not user:
            response = redirect("users:login")
            response.delete_cookie("session_id")
            return response

        # Vérifier si l'ID dans l'URL correspond à l'utilisateur connecté
        if str(user["_id"]) != id:
            # Rediriger ou afficher une erreur si l'ID ne correspond pas
            return redirect("users:home")  # Ou une page d'erreur/message

        # Récupérer les données du formulaire à mettre à jour
        update_data = {
            # Exemple: ajouter d'autres champs au besoin
            "first_name": request.POST.get("first_name", user.get("first_name")),
            "last_name": request.POST.get("last_name", user.get("last_name")),
            "phone_number": request.POST.get("phone_number", user.get("phone_number")),
            "bio": request.POST.get("bio", user.get("bio")),
            "location": request.POST.get("location", user.get("location")),
            # N'ajoutez pas ici les champs sensibles comme 'password', 'username', 'avatar'
        }

        # Nettoyer les données (retirer les champs vides si vous ne voulez pas les écraser)
        update_data = {k: v for k, v in update_data.items() if v is not None}

        if update_data:
            db.update_user(user["_id"], update_data)
            # Optionnel: Ajouter un message de succès
            # messages.success(request, "Profil mis à jour avec succès !")

        # Rediriger vers la page de profil après la mise à jour
        return redirect("users:profile", id=str(user["_id"]))

class RelationshipGraphView(View):
    def get(self, request):
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

            # Récupérer les notifications avec pagination
            page = int(request.GET.get('page', 1))
            notifications_data = db.get_user_notifications(user["_id"], page=page)

            # The base's url to use when to search a user
            search_user_base_url = reverse('users:search', kwargs={'pattern':'_'})
            index_2nd_last_slash = search_user_base_url.rfind('/', 0, len(search_user_base_url) - 1)
            search_user_base_url = search_user_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            # The base's url to use when to start a new conversation
            start_conversation_base_url = reverse('conversations:start-conversation', kwargs={'id':'_'})
            index_2nd_last_slash = start_conversation_base_url.rfind('/', 0, len(start_conversation_base_url) - 1)
            start_conversation_base_url = start_conversation_base_url[0:index_2nd_last_slash + 1]  # We just need the base root
            
            # The base's url to use when to make the user follow another user
            follow_user_base_url = reverse('users:follow', kwargs={'id':'_'})
            index_2nd_last_slash = follow_user_base_url.rfind('/', 0, len(follow_user_base_url) - 1)
            follow_user_base_url = follow_user_base_url[0:index_2nd_last_slash + 1]  # We just need the base root

            context = {
                'relationship_graph_data_url': reverse('users:relationship-graph-data'),
                "user": user, 
                'search_user_base_url': search_user_base_url,
                'start_conversation_base_url': start_conversation_base_url,
                'follow_user_base_url': follow_user_base_url,
                "notifications": notifications_data["notifications"],
                "unread_notifications_count": notifications_data["unread_count"],
                "has_more_notifications": notifications_data["has_more"],
                "current_page": page
            }

            return render(request, 'users/relationship-graph.html', context)
        
class RelationshipGraphDataView(View):
    def get(self, request):
        # Retrive user
        user = db.get_user(request)

        # Return the data needed by cy
        found = {  # a dictionnary of the already checked user
        }
        stack = [user]  # A list of the next user to treat
        elements= {     # The data to send to th front (cytoscape). If you do not know what it is, bro, google it
            'nodes': [],
            'edges': [],
        }  

        while stack:
            current_user = stack[0]
            # if not found.get(current_user['_id'], False):
            if not found.get(str(current_user['_id']), False):
                node = {'data': {
                    'id': str(current_user['_id']), 
                    'label': current_user['username'],
                    'image': reverse('users:avatar', kwargs={'id':str(current_user['_id'])})
                    }
                }
                elements['nodes'].append(node)
                # found[current_user['_id']] = True
                found[str(current_user['_id'])] = True

            for following_id in current_user['followings']:
                # Fetch the user
                following = db.db.users.find_one({'_id': following_id}, {'_id':1, 'username':1, 'followings':1})

                # Add it as nodes if not already found
                if not found.get(current_user['_id'], False):
                # if not found.get(str(current_user['_id']), False):
                    node = {'data': {
                        'id': str(following['_id']), 
                        'label': following['username'],
                        'image': reverse('users:avatar', kwargs={'id':str(following['_id'])})
                        }
                    }

                    elements['nodes'].append(node)
                    # found[current_user['_id']] = True
                    found[str(current_user['_id'])] = True

                # Add the following relationsip between the current_user and its following
                edge = {'data': {'source': str(current_user['_id']), 'target': str(following['_id'])}}
                elements['edges'].append(edge)

                # Add this newly discovered following to the stack, so that it can be treated too (find its relationships)
                stack.append(following)
            
            stack.pop(0)

        # Return the build data to the front as a Json response
        response = JsonResponse(data=elements)
        return response
