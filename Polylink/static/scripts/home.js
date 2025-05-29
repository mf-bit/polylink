// Some utility functions

/**
 * Split the cookie header parameter into a list of object. Each object consists of two pair: the key of the cookie and each value.
 * @returns {Object} A object where its key corresponds to a cookie name, and the associated value the cookie value.
 */
function getCookies(){
    let cookiesList = document.cookie.split(";");
    let cookiesObject = {};
    cookiesList.forEach((str) =>{
        let cookie = str.split('=');  // This returns a list. The first element is the cookie and the second its value.
        cookiesObject[cookie[0]] = cookie[1];
    })
    return cookiesObject;
}

/** A utility variale holding the cookies 'a chaud': je raffole des cookies 😁. */
let cookies = getCookies();

/** 
 * Handles the user research
 */
class SearchInput{
    /**
     * Initilizer
     * @param {HTMLElement} element The input the user interact to search for some user
     */
    constructor(element){
        this.input = element;
        this.resultBlockEl = this.input.parentElement.querySelector('.results');
        this.search_user_base_url = this.input.attributes.url.value;
        this.start_conversation_base_url = this.resultBlockEl.attributes.url.value;
        this.init();
    }

    /**
     * Attachs some event listener to the element
     */
    init(){
        this.input.addEventListener('input', this.search.bind(this));
        this.resultBlockEl.addEventListener('click', (event) => console.log('=== ==='));
        // this.resultBlockEl.addEventListener('click', (event) => this.startConversation.bind(this)(event));
    }

    /**
     * Load the result of reaseach on the pade
     * @param {JSON} data A json format data containing the user requested
     */
    load(data){
        this.resultBlockEl.innerHTML = '';
        data.forEach(user_infos => {
            let result = document.createElement('div');
            result.classList.add('result');
            result.innerHTML = `
                <div class="avatar">
                    <img src=${user_infos['avatar_url']} alt="profil">
                </div>
                <h4>${user_infos['first_name']} ${user_infos['last_name']} </h4>
                <p><span style='color: rgb(255, 102, 0);'>@</span><span class='result-username'>${user_infos['username']}</span></p>
            `;
            this.resultBlockEl.appendChild(result);
        })
    }

    /**
     * Handles the researches
     */
    search(){
        // Check if the pattern is valid
        const pattern = this.input.value;
        if(pattern == '')
            return;

        // Build the endpoint to query
        const endpoint = `${this.search_user_base_url}${pattern}`;

        fetch(endpoint, {
            method: 'get',
            headers: {
                'X-CSRFToken': cookies.csrftoken, 
            }
        })
        .then(response => response.json())
        .then(data => this.load(data))
        .catch(error => console.log(`Error while searching users: ${error}`));
    }

    /**
     * Starts a new conversation
     * @param {Event} event The event triggered in the DOM
     */
    startConversation(event){
        // Find the clicked conversation
        console.log('===  ====');
        let target = event.target;
        if(!target.classList.contains('result'))
            if(target.parentElement.classList.contains('result'))
                target = target.parentElement;
            else
                return;  // stop the process of no conversation is triggered
        
        // Retrive the other user username
        const other_user_username = target.querySelector('.result-username').innerText;
        
        // Ask the server to start a new conversation
        const endpoint = `${this.start_conversation_base_url}${other_user_username}/`;
        fetch(endpoint, {
            method: 'post',
            headers: {
                'X-CSRFToken': cookies.csrftoken, 
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // Test if their is no error
            if(data.error){
                alert(data.error);
                return;
            }
            const avatar_src = target.querySelector('img').src;
            const completeName = target.querySelector('h4').innerText;
            Conversation.addNewConversation(data.conversation_src, avatar_src, completeName);
        })
        .catch(error => console.log(error));    
    }
}

/**
 * This represents a post element
 * @class
 */
class Post {
    /**
     * Instanciates a new post object: yeah I know you know what it does, I just do not care 😒!
     * @param {HTMLElement} post The Http element representing the post.
     */
    constructor(post) {
        this.postElement = post;
        this.isLiked = false;
        /** The Http element representing the button to trigger to link the post. */
        this.likeButton = post.querySelector(".like-button");
        this.likeButton.addEventListener('click', this.toggleLike.bind(this));

        /** The comments section */
        this.commentsSection = post.querySelector(".post-comments"); 
        this.commentsSection.style.display = "none"; 

        /** The Http element representing the button to trigger to comment the post. */
        this.seeCommentButton = post.querySelector(".see-comment-button");
        this.seeCommentButton.addEventListener("click", this.toggleCommentVisibility.bind(this));

        /** The Http element representing the button to trigger to write a comment */
        this.commentButton = post.querySelector(".comment-button");

        /** The element that the user must interact in order to make a comment */
        this.letCommentEl = post.querySelector(".comment-cta");  // This is a form by the way       
        this.letCommentEl.querySelector("button").addEventListener("click", this.letComment.bind(this));

        /** The element, used as a button to trigger to delete the post */
        this.deletePostButton = post.querySelector(".delete-post-button");
        this.deletePostButton.addEventListener("click", this.delete.bind(this));
    }

    /**
     * Makes the post be liked if not liked yet and remove the like otherwise when clicked on it.
     */
    toggleLike() {
        if (this.isLiked) {
            /* Resquest to the DB to remove like here */
            this.isLiked = false;
            this.likeButton.classList.remove("bi-heart-fill");
            this.likeButton.classList.add("bi-heart");
            this.likeButton.style.color = "black";
        }
        else {
            /* Resquest to the DB to add like here */
            this.isLiked = true;
            this.likeButton.classList.remove("bi-heart");
            this.likeButton.classList.add("bi-heart-fill");
            this.likeButton.style.color = "red";
        }
    }

    /**
     * Toggles the visibility of the comments section.
     */
    toggleCommentVisibility() {
        if (this.commentsSection.style.display == "none"){
            this.commentsSection.style.display = "block";
        }
        else{
            this.commentsSection.style.display = "none";
        }
    }

    /**
     * Handles a comment action on a post.
     */
    letComment() {
        let textEl = this.letCommentEl.querySelector("textarea");

        // Make a request to the database to store the comments 
        this.letCommentEl.submit();

        // Receive the comment and insert in the comments section, after the comment-cta section (cta stands for call to action if you didn't know 🤧)
        // ======== that is better to let this following handled by the backend later ============
        let content = textEl.value;
        let commentEl = document.createElement("div");
        commentEl.innerHTML = `
            <div class="post-comment">
                <div class="avatar post-avatar">
                    <img src=${document.querySelector(".sidebar .profile .avatar img").src} alt="profil">
                </div>
                <p>${content}</p> <!-- This has 'white-space: pre-line', be careful then -->
            </div>
            `;
        this.commentsSection.insertBefore(commentEl, this.letCommentEl.nextElementSibling);

        // Clear the textEl content
        textEl.value = "";
    }

    /**
     * Handles the deletion of post.
     */
    delete(){
        // Send a request to the back and ask ot to delete the post
        const endpoint = this.deletePostButton.attributes.url.value;
        fetch(endpoint, {
            method: "delete",
            headers: {
                'X-CSRFToken': cookies.csrftoken
            }
        }).catch();

        // Removes the post from the from
        this.postElement.remove();
    }
}

/**
 * This represents the post-cta section. 
 * @class
 */
class PostCTAWrapper {
    /**
     * Instantiates a new object. I can resist: It is stronger than me commenting even if I know you know 😭
     * @param {HTMLElement} postCTAWrapper The block representing the post call-to-action section.
     */
    constructor(postCTAWrapper) {
        this.postCTAWrapperEl = postCTAWrapper;  // this is a form by the way
        this.textEl = postCTAWrapper.querySelector("textarea");

        /** The button that the user must trigger to attach a image to its post / The input containing the attached images. */
        this.attachButton = postCTAWrapper.querySelector(".attach-image-button");
        this.input = postCTAWrapper.querySelector("input#attach");
        this.input.addEventListener("change", this.loadAttach.bind(this));

        this.button = postCTAWrapper.querySelector("button");
        this.button.addEventListener("click", (event) => this.post.bind(this)(event));

        /** The section containing any uploaded attachement */
        this.attachSection = postCTAWrapper.querySelector(".attach-wrapper");

        /** The image element containing the uploaded attachement */
        this.attachImgEl = postCTAWrapper.querySelector(".attach-wrapper img");

        /** The button to click on in order to discard a chosen attachement */
        this.discardAttachButton = postCTAWrapper.querySelector(".attach-wrapper .discard-attach-button");
        this.discardAttachButton.addEventListener("click", this.discardAttach.bind(this));
    }

    /** Handles the action of liking a post */
    like(){
        ;
    }

    /**
     * Handles the action that consist of posting a new post.
     */
    post(){
        // Post the ressources to the backend
        // this.postCTAWrapperEl.submit();
        const endpoint = this.postCTAWrapperEl.action;
        let formData = new FormData(this.postCTAWrapperEl);
        fetch(endpoint, {
            method: "POST",
            headers: {
                'X-CSRFToken': cookies.csrftoken,
            },
            body: formData,
        }).then(response => response.json())
        .then(data => {
            // Retrive and add post to the posts section, just after the post-cta section (the section this object represents then)
            // You better let the backend give you the block's html structur after
            let content = this.textEl.value;
            let postEl = document.createElement("div");
            // The cross-validation token inserted by Django
            let csrf_value= cookies.csrftoken;  // This variable is created early in this script: look at above 

            // Send the data to the server
        
            postEl.innerHTML = `
            <article class="post">
                <div class="post-header">
                    <div class="avatar">
                        <img src=${this.postCTAWrapperEl.querySelector(".avatar img").src} alt="profil">
                    </div>
                    <div>
                        <h4>${document.querySelector(".sidebar .infos h4").textContent}</h4>
                        <p>${new Date().toISOString()}</p>
                    </div>
                    <i class="bi bi-x-circle-fill delete-post-button" url=${data.delete_url}></i>
                </div>
                <p class="post-text">${content}</p> <!-- This has 'white-space: pre-line', be careful then -->`   
                +
                ((this.input.value !='')?( `<img src=${this.attachImgEl.src} alt="Post Content" class="post-image" />`):`` )   // Here we add the image tag only if an image exist
                +
                `
                <div class="post-actions">
                    <i class="like-button bi bi-heart-fill"></i>
                    <p class="likes">0</p>
                    <i class="bi bi-eye"></i>
                    <p class="views">0</p>
                    <i class="see-comment-button bi bi-chat-dots"></i>
                </div>

                <div class="post-comments">
                    <form method="Post" action="{% url "posts:comment-post" id=post.id %}" class="comment-cta">
                        <input type=hidden name="csrfmiddlewaretoken" value=${csrf_value} />
                        <div class="avatar post-avatar">
                            <img src=${this.postCTAWrapperEl.querySelector(".avatar img").src} alt="profil">
                        </div>
                        <textarea name="content" spellcheck="false" type="text" placeholder="Want to let a comment?"></textarea>
                        <button type="button" class="button comment-cta-button">Pin</button>
                    </form>
                </div>
            </article>
            `;
            let feedEl = document.querySelector(".feed");  // the feed represents the block that has the posts, stories, etc. That is the block in the middle of the page
            feedEl.insertBefore(postEl, this.postCTAWrapperEl.nextElementSibling)

            // We have to link this new post element to a postObject to make it alive
            new Post(postEl);

            // Clear textarea content and remove the attach
            this.textEl.value = "";
            this.textEl.style.height = 'auto';
            this.discardAttach();
        })
        .catch(error => console.log(error));
    }

    /** 
     * Loads the attached image (on the front-side, the page) 
     * */
    loadAttach(){
        // Ensures that something is really attach and that that thing is an image: never trust an user input 😒!
        if(this.input.files.length == 0 || !this.input.files[0].type.includes("image"))
            return;
        
        const reader = new FileReader();
        reader.onload = () => {
            this.attachImgEl.src = reader.result;  // upload the image on the front
            this.attachSection.style.display = "block";   // make the attachment section visible
        }
        // Notice that when the reader.onload function will be executed, the context will be tied to the global object, wchich is here
        // (in the browser) the window object. We have to set the 'this' keyword to the current obejct then. Dawm I handle this concept 😍!
        // reader.onload.bind(this);

        reader.readAsDataURL(this.input.files[0]);
    }

    /** 
     * Discards a chosen attached image.
     * */
    discardAttach(){
        // Remove the selected attachement from the input element
        this.input.value = "";
        // Remove the attachement rendering from the page
        this.attachImgEl.src = "";
        this.attachSection.style.display = "none";
    }

    /**
     * Checks if a file name or path represents an images.
     * @param {String} value Path or name of the file in a string representation.
     */
    isImage(value){
        const acceptedExt = ["png", "jpg", "jpge"];
        let lastDotIndex = value.indexOf(".");
        let ext = value.substring(lastDotIndex + 1, value.length);
        return acceptedExt.includes(ext);
    }
}


/**
 * This represents a story block the user must trigger to add a story.
 * @class
 */
class AddStoryEl{
    /**
     * Instantiate a new element.
     * @param {HTMLElement} addStoryElement The html block that represents the story block to trigger in order to add a story.
     */
    constructor(addStoryElement){
        this.addStoryEl = addStoryElement;
        /** The input aimed to received the upload video */
        this.input = addStoryElement.querySelector("input.story-attach-input");
        this.input.addEventListener("change", this.uploadStory.bind(this));

        /** The endpoint to query in order to upload a new story */
        this.endpoint = this.addStoryEl.attributes.url.value;
    }

    /** 
     * Handles a story upload to the platform
     */
    uploadStory(){
        // Ensures that a file is really upload and that what is upload is really a video: users are the worst dev'ops
        if(this.input.files.length == 0 || !this.input.files[0].type.includes("video"))
            return;

        // Send the previous extracted infos to the server
        const formData = new FormData();
        formData.append("content", this.input.files[0]);
        fetch(this.endpoint, {
            method: "POST",
            headers: {
                "X-CSRFToken": cookies.csrftoken,
            },
            body: formData,
        }).then(response => {if(response.ok) return response.json();})
        .then(data => {
            // Once we upload the story, the server will provide us with the the ressource's url, the thumbnail's url, and deletion's url too
            let content_url = data.content_url; 
            let thumbnail_url = data.thumbnail_url;
            let delete_url = data.delete_url;

            // Insert the newly upload story on the front
            console.log(`content-url: ${content_url}`);
            console.log(`thumbbnail-url: ${thumbnail_url}`);
            const element = document.createElement("a");
            element.href = content_url;
            element.innerHTML = `
                <div class="story">
                    <i class="bi bi-x-circle-fill delete-post-button" url=${delete_url}></i>
                    <img class="cover" src=${thumbnail_url} alt="cover">
                </div>
            `;
            this.addStoryEl.parentElement.insertBefore(element, this.addStoryEl.nextElementSibling);
        })
        .catch();
    }
}

/** 
 * This represents a story element.
 */
class Story{
    /**
     * Instantiate a new element.
     * @param {HTMLElement} story The html block that represents the story block.
     */
    constructor(story){
        this.story = story;
        this.deleteButton = story.querySelector(".delete-post-button");
        this.deleteButton.addEventListener("click", (event) => this.delete.bind(this)(event));
    }

    /**
     * This handles the deletion of a story
     * @param {Event} event The event object triggered by the DOM
     */
    delete(event){
        // Prevent the anchor from being triggered
        event.preventDefault();
        event.stopImmediatePropagation();
        fetch(this.deleteButton.attributes.url.value, {
            method: "DELETE",
            headers: {
                "X-CSRFToken": cookies.csrftoken,
            },
        })

        // Remove the post from the page
        this.story.remove();
    }
}

// /**
//  * This represents a block containing the content of a given conversation
//  */
// class InsideConversation{
//     /**
//      * Initializer
//      * @param {HTMLElement} element The element representing the inside of a conversation
//      */
//     constructor(element){
//         this.inside = element;
//         this.endpoint;
//     }

//     /**
//      * Renders the content of the element
//      */
//     render(body, send_message_endpoint, friend_name){
//         this.inne
//     }

//     /**
//      * This makes the element dynamic by attaching it some event listeners
//      */
//     init(){
//         this.inside.querySelector('.go-back-button').addEventListener('click', this.goBack.bind(this));
//         this.inside.querySelector('.send-button').addEventListener('click', this.sendMessage.bind(this));
//     }

//     /**
//      * Handles messages sending process
//      */
//     sendMessage(){
//         const endpoint = this.element.querySelector('.write-message').attributes.url.value;
//         const content = this.element.querySelector('textarea').value;
//         fetch(endpoint, {
//             method: 'POST',
//             headers: {
//                 "X-CSRFToken": cookies.csrftoken,
//                 'Content-Type': 'text/plain',
//             },
//             body: content,
//         }).then(response => {
//             // Add the message on the page
//             let body = this.element.querySelector('.body');
//             let message = document.createElement('div');
//             message.classList.add('sent', 'message');
//             message.innerHTML = `<p class="text">${content}</p>`
//             body.insertBefore(message, null);

//             // Make the body scroll to the end to make the new added element visible
//             body.scrollTo({top: body.scrollHeight, behavior: 'smooth'});

//             // Clear the text input
//             this.element.querySelector('textarea').value = '';
//         })
//         .catch(error => console.log(`Error while sending message: ${error}`));
//     }
// }

/**
 * This represents a conversation element 
 */
class Conversation{
    /** The wrapper that contains every conversations: we will need to modify its content to show the message of this conversaion */
    static conversationsBlockEl = document.querySelector('.conversations');

    static convsersationListEl = document.querySelector('.conversation-list');

    /** The block that contains the message of specific conversation: when a conversation is clicked, this part is update to content of that con */
    static insideConversation = document.querySelector(".inside-conversation");

    /** This is an array of already requested converstions: if a conversation is fetch one time, it will not be fetch again */
    static fetchedConversations = {};

    /**
     * Initializes a new conversation object
     * @param {HTMLElement} element The html element that represents the conversation.
     */
    constructor(element){
        /** The element representing the conversation */
        this.conversationEl = element;

        this.unreadMessageNumEl = this.conversationEl.querySelector('.infos span');
        this.lastMessageViewEl = this.conversationEl.querySelector('.last-message-view');  
        this.lastMessageDateEl = this.conversationEl.querySelector('.infos p');

        /** The endpoint to query in order the load the messages */
        this.endpoint = this.conversationEl.attributes.url.value;

        this.init();
    }
    /**
     * This initialize the elements by attaching events to them
     */
    init(){    
        this.conversationEl.addEventListener('click', this.fetchAndLoad.bind(this));
    }

    /** 
     * Fetchs a conversation from the database and loads it in the front
     */
    fetchAndLoad(){
        fetch(this.endpoint, {
            method: 'GET',
            headers: {
                "X-CSRFToken": cookies.csrftoken,
            }
        })
        .then(response => response.text())
        .then(data => {
            this.feed(data); 
            Conversation.fetchedConversations[this.endpoint] = data;
        })
        .catch(error => console.log(`Loading message for the conversation fails: ${error}`));
    }

    /**
     * Loads the messages of the conversation in a intelligent way.
     */
    load(){
        if(!Conversation.fetchedConversations[this.endpoint])
            this.fetchAndLoad();
        else
            this.feed(fetchedConversations[this.endpoint]);
    }

    /**
     * This feeds the block element that have to contain the conversation content.
     * @param {String} content A string representing the content to insert within the block that has to contain a conversation content
     */
    feed(content){
        Conversation.insideConversation.innerHTML = content;
        /** Activate the button to trigger to send a message */
        let sendButton = Conversation.insideConversation.querySelector('.send-button');
        sendButton.addEventListener('click', this.sendMessage.bind(this));

        // Make the textarea (input user interact to write message) dynamic
        new Textarea(Conversation.insideConversation.querySelector('textarea'));

        // Make the go back button dynamic: the button that get back the conversations list section
        let button = Conversation.insideConversation.querySelector('.go-back-button');
        button.addEventListener('click', () => {
            // Hide the conversation list block and make the content inside the conversation visible
            Conversation.insideConversation.classList.remove('shown');
        });

        // Hide the conversation list block and make the content inside the conversation visible
        Conversation.insideConversation.classList.add('shown');

        // Scroll the body till the end
        let body = Conversation.insideConversation.querySelector('.body');
        body.scrollTo({top: body.scrollHeight, behavior: 'instant'});
    }

    /**
     * Handles messages sending process
     */
    sendMessage(){      
        const endpoint = Conversation.insideConversation.querySelector('.write-message').attributes.url.value;
        const content = Conversation.insideConversation.querySelector('textarea').value;
        fetch(endpoint, {
            method: 'POST',
            headers: {
                "X-CSRFToken": cookies.csrftoken,
                'Content-Type': 'text/plain',
            },
            body: content,
        }).then(response => {
            // Add the message on the page
            let body = Conversation.insideConversation.querySelector('.body');
            let message = document.createElement('div');
            message.classList.add('sent', 'message');
            message.innerHTML = `<p class="text">${content}</p>`
            body.insertBefore(message, null);

            // Make the body scroll to the end to make the new added element visible
            body.scrollTo({top: body.scrollHeight, behavior: 'smooth'});

            // Clear the text input and resize it
            Conversation.insideConversation.querySelector('textarea').value ='';
            Conversation.insideConversation.querySelector('textarea').style.height = 'auto';

            // Update the view of the last message of the conversation
            this.lastMessageViewEl.innerHTML = `${content.substring(0, 10)}...`;
        })
        .catch(error => console.log(`Error while sending message: ${error}`));
    }

    /**
     * Loads a new conversation to  the list
     * @param {String} conversation_url The conversation url to request to get the content of the conversation
     * @param {String} avatar_src The location of the avatar ressource
     * @param {String} completeName The complete name of the other user whom the want to communicate  
     */
    static addNewConversation(conversation_url, avatar_src, completeName){
        const date = new Date();
        const conversation = document.createElement('div');
        conversation.classList.add('conversation');
        conversation.attributes.url = conversation_url;
        conversation.innerHTML = `
            <div class="avatar">
                <img src=${avatar_src} alt="profil">
            </div>
            <div>
                <h4>${completeName}</h4>
                <p class='last-message-view'></p>
                </div>
                <div class="infos">
                <p>${date.getHours()}:${date.getMinutes()}</p>
                <span style='white-space: pre;'> </span>
            </div>
        ` ;
        Conversation.convsersationListEl.insertBefore(conversation, Conversation.convsersationListEl.firstElementChild);
    }
    
}


/**
 * This represents a textarea element.
 */
class Textarea{
    /**
     * Initializes a new textarea element. It is use to handle the auto resize of textarea element.
     * @param {HTMLElement} element The element representing the textarea.
     */
    constructor(element){
        this.textareaEl = element;
        this.textareaEl.addEventListener("input", this.adjustHeight.bind(this));
    }

    adjustHeight(){
        this.textareaEl.style.height = "auto";
        this.textareaEl.style.height = (this.textareaEl.scrollHeight) + "px";
    }

}

// ===================================================================================
// ===================================================================================

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

// const file = document.querySelector(".post-cta input").files[0];
// const reader = new FileReader();
// reader.onload = function(event){
//     const reader = event.target;
//     console.log(`Result: ${reader.result}`);
// }

// // reader.readAsText(file);
// reader.readAsDataURL(file);
// console.log(reader.result)
