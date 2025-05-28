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
            "likes": [],
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
    
# polylink/posts/views.py
class LikeView(View):
    def get(self, request, id: str):
        user_id = db.get_user_id(request)
        if not user_id:
            return JsonResponse({"error": "Unauthorized"}, status=401)

        try:
            user_id_obj = bson.ObjectId(user_id)
            post_id_obj = bson.ObjectId(id)
            post = db.db.posts.find_one({"_id": post_id_obj})
            
            if not post:
                return JsonResponse({"error": "Post introuvable"}, status=404)

            # Vérifier si l'utilisateur a déjà liké
            if user_id_obj in post.get("likes", []):
                return JsonResponse({"error": "Déjà liké"}, status=400)

            # Ajouter le like
            db.db.posts.update_one(
                {"_id": post_id_obj},
                {"$addToSet": {"likes": user_id_obj}}
            )

            # Créer une notification
            db.create_notification(
                recipient_id=post["author"],
                actor_id=user_id_obj,
                post_id=post_id_obj,
                action_type="like"
            )

            return JsonResponse({"success": True})

        except bson.errors.InvalidId:
            return JsonResponse({"error": "ID invalide"}, status=400)
            
class CommentView(View):
    def post(self, request: HttpRequest, id: str):
        user_id = db.get_user_id(request)
        if not user_id:
            return JsonResponse({"error": "Unauthorized"}, status=401)

        try:
            user_id_obj = bson.ObjectId(user_id)
            post_id_obj = bson.ObjectId(id)
            
            # Insérer le commentaire
            db.db.comments.insert_one({
                "content": request.POST.get("content"),
                "date": datetime.now(timezone.utc),
                "post": post_id_obj,
                "author": user_id_obj,
            })

            # Récupérer le post pour obtenir l'auteur
            post = db.db.posts.find_one({"_id": post_id_obj})
            if post:
                db.create_notification(
                    recipient_id=post["author"],
                    actor_id=user_id_obj,
                    post_id=post_id_obj,
                    action_type="comment"
                )

            return HttpResponse(status=204)

        except bson.errors.InvalidId:
            return JsonResponse({"error": "ID invalide"}, status=400)

class PostDetailView(View):
    def get(self, request, id: str):
        user_id = db.get_user_id(request)
        if not user_id:
            return JsonResponse({"error": "Unauthorized"}, status=401)

        try:
            post_id_obj = bson.ObjectId(id)
            post = db.db.posts.find_one({"_id": post_id_obj})
            
            if not post:
                return JsonResponse({"error": "Post introuvable"}, status=404)
            
            # Récupérer les informations de l'auteur
            author = db.db.users.find_one({"_id": post["author"]})
            
            # Préparer les données du post
            post_data = {
                "id": str(post["_id"]),
                "content": post["content"],
                "date": post["date"].strftime("%d/%m/%Y %H:%M"),
                "likes_count": len(post.get("likes", [])),
                "views": post.get("views", 0),
                "has_image": "image" in post,
                "author": {
                    "id": str(author["_id"]),
                    "username": author["username"],
                    "first_name": author["first_name"],
                    "last_name": author["last_name"]
                }
            }
            
            return JsonResponse(post_data)
            
        except bson.errors.InvalidId:
            return JsonResponse({"error": "ID invalide"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)