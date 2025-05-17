from django.shortcuts import render
import bson
from django.http import HttpResponse
import db
from django.views import View

# Create your views here.
class StoryThumbnailView(View):
    def get(self, request, id:str):
        story = db.db["stories"].find_one({"_id": bson.ObjectId(id)})
        img_bytes = bytes(story["thumbnail"])
        content_type = f"image/{story["thumbnail_format"]}"
        return HttpResponse(content=img_bytes, content_type=content_type)
    
class StoryContentView(View):
    def get(self, request, id:str):
        story = db.db["stories"].find_one({"_id": bson.ObjectId(id)})
        img_bytes = bytes(story["content"])
        content_type = f"video/{story["format"]}"
        return HttpResponse(content=img_bytes, content_type=content_type)
    