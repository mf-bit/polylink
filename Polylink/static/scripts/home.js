import {cookies, SearchInput, Post, PostCTAWrapper, AddStoryEl, Story, Conversation, Textarea} from './utils.js';

// Handle the autoresize textareas
const postInputEls = document.querySelectorAll("textarea");
postInputEls.forEach((postInputEl) => new Textarea(postInputEl));

// Create Post elements and the PostCTAWrapper element
let postList = document.querySelectorAll(".post");
postList.forEach((post) => {
    new Post(post);
})
new PostCTAWrapper(document.querySelector(".post-cta-wrapper"));

// Create stories elements
let stories = document.querySelectorAll(".feed .story:not(.add-story)"); // Note that we do not need to handle the .add-story element element
stories.forEach((story)=>{
    new Story(story);
})

// Create a addStory element object
let story = document.querySelector(".feed .story.add-story");
new AddStoryEl(story);

// Creating the conversation objects
let conversations = document.querySelectorAll('.conversation');
conversations.forEach(con => new Conversation(con));

// Make the input used to search user dynamic
new SearchInput(document.querySelector('.search-user-input'));
