from django.shortcuts import render
from django.views import View
from django.http import HttpResponse, HttpRequest, JsonResponse
import db
from datetime import datetime, timezone
import bson
from django.urls import reverse

class PostView(View):
    def post(self, request:HttpRequest):
        user_id = db.get_user_id(request)
        content = request.POST.get("content")

        # Insert basic informations we sure the existance for every post
        post = db.db.posts.insert_one({
            "author": bson.ObjectId(user_id),
            "content": content,
            "date": datetime.now(timezone.utc),
            "likes": 0,
            "views": 0,
        })

        # Add image if provided
        image_file = request.FILES.get("image", None)
        if image_file:
            image = image_file.read()  # this is a bytes object by the way
            image_name = request.FILES.get("image").name
            ext = image_name[image_name.rfind(".") + 1 : len(image_name)].lower() # retreive extension from image name

            db.db.posts.update_one({'_id': post.inserted_id},
                {'$set': {
                    "image": bson.Binary(image),
                    "image_format": ext,
                }}
            )
        content = {
            "delete_url": reverse('posts:delete-post', kwargs={"id":post.inserted_id})
        }
        response = JsonResponse(content)
        return response
    
    def delete(self, request:HttpRequest, id:str):
        # Delete the associated comments first
        db.db.comments.delete_many({"post": bson.ObjectId(id)})
        db.db.posts.delete_one({"_id": bson.ObjectId(id)})
        response = HttpResponse()
        response.status_code = 204 # No content is being return
        return response
        
class PostImageView(View):
    def get(self, request, id:str):
        post = db.db["posts"].find_one({"_id": bson.ObjectId(id)})   
        img_bytes = bytes(post["image"])
        content_type = f"image/{post["image_format"]}"
        return HttpResponse(content=img_bytes, content_type=content_type)
    
class LikeView(View):
    def get(self, request, id:str):
        pass

class CommentView(View):
    def post(self, request: HttpRequest, id:str):
        # Retreive the user
        user_id = db.get_user_id(request)
        db.db.comments.insert_one({
            "content": request.POST.get("content"),
            "date": datetime.now(timezone.utc),
            "post": bson.ObjectId(id),
            "author": user_id,
        })

        response = HttpResponse()
        response.status_code = 204  # No data is being return
        return response