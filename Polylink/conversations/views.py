from django.shortcuts import render
from django.views import View
import db
import bson
from datetime import datetime, timezone
from django.http import HttpResponse, HttpRequest, JsonResponse
from django.urls import reverse

class ConversationView(View):
    def get(self, request, id):     
        # Fetch the user id
        user_id = db.get_user_id(request)

        # Fetch the other user whom this user is chatting with
        participants_ids = db.db.conversations.find_one({"_id": bson.ObjectId(id)})['participants']
        if participants_ids[0] == user_id:
            other_user_id = participants_ids[1]
        else:
            other_user_id = participants_ids[0]
        other_user = db.db.users.find_one({'_id':other_user_id}, {"_id": 0, 'id': '$_id', 'first_name': 1, 'last_name': 1})  

        messages = list(db.db.messages.find({'conversation': bson.ObjectId(id)}))
    
        return render(request, 'conversations/inside-conversation.html', {'conversation_id': id , 'messages': messages, 'user_id': user_id, 'other_user': other_user})
    
    def post(self, request, id):
        user_id = db.get_user_id(request)
        
        # Verify if the other_user_id is not the user itseft
        if user_id == id:
            return JsonResponse(data={'error': 'You cannot talk to your self bro, what u doing 🤨'})
        
        # Verify if the other user does not already have a discussion
        conversation = db.db.conversations.find_one({
            '$and': [
                {'participants': {'$in': [bson.ObjectId(user_id)]}},
                {'participants': {'$in': [bson.ObjectId(id)]}},
            ]
        })
 
        if conversation:
            return JsonResponse(data={'error': 'Bro, you are already in talk with this guys, come on man 😭'})
        
        conversation = db.db.conversations.insert_one({
            'participants': [bson.ObjectId(user_id), bson.ObjectId(id)]
        })

        # Return to the client the id of the newly inserted conversation
        conversation_src = reverse('conversations:conversation', kwargs={'id':str(conversation.inserted_id)})
        response = JsonResponse(data={'conversation_src': conversation_src})
        return response

class MessageView(View):
    def get(self, request, id):
        pass
    
    def post(self, request:HttpRequest, id):
        user_id = db.get_user_id(request)
        content = request.body.decode('utf-8')
        message = db.db.messages.insert_one({
            'sender': bson.ObjectId(user_id),
            'content': content,
            'date': datetime.now(timezone.utc),
            'seen': False,
            'conversation': bson.ObjectId(id),
        })

        # Update the last message of the conversation
        db.db.conversations.update_one(
            {'_id': bson.ObjectId(id)}, 
            {'$set': {
                'last_message': message.inserted_id,
            }}
        )

        response = HttpResponse()
        response.status_code = 204  # Nothing to return
        return response
