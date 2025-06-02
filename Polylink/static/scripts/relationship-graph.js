import {cookies, SearchInput, Post, Conversation, Textarea} from './utils.js';

// Handle the autoresize textareas
const postInputEls = document.querySelectorAll("textarea");
postInputEls.forEach((postInputEl) => new Textarea(postInputEl));

// Creating the conversation objects
let conversations = document.querySelectorAll('.conversation');
conversations.forEach(con => new Conversation(con));

// Make the input used to search user dynamic
new SearchInput(document.querySelector('.search-user-input'));

