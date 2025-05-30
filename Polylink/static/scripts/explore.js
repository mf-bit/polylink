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
        this.resultBlockEl = document.querySelector('.results');
        this.search_user_base_url = this.input.attributes.url.value;
        this.start_conversation_base_url = this.resultBlockEl.attributes.url.value;
        /* This variable hold the id of the current search request: it is the id of a timeout process */
        this.currentSearchTimeoutId;
        this.init();
    }

    /**
     * Attachs some event listener to the element
     */
    init(){
        this.input.addEventListener('input', this.search.bind(this));
        this.resultBlockEl.addEventListener('click', (event) => this.startConversation.bind(this)(event));
    }

    /**
     * Load the result of reaseach on the pade
     * @param {JSON} data A json format data containing the user requested
     */
    load(data){
        // Check if the data array is empty or not
        if(data.length == 0){
            this.resultBlockEl.innerHTML = '<p class="nothing-found-placeholder">Nothing found 😭😁🤧</p>';
            return;
        }
        
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
        
        // Set a timeout before requesting
            // Clear the previous request timeout before sending a new one
        clearTimeout(this.currentSearchTimeoutId);

        this.currentSearchTimeoutId = setTimeout(() => {
            fetch(endpoint, {
            method: 'get',
            headers: {
                'X-CSRFToken': cookies.csrftoken, 
            }
        })
        .then(response => response.json())
        .then(data => this.load(data))
        .catch(error => console.log(`Error while searching users: ${error}`));
        }, 100);
    }

    /**
     * Starts a new conversation
     * @param {Event} event The event triggered in the DOM
     */
    startConversation(event){
        // Find the clicked conversation
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
     * @param {HttpElement} post The Http element representing the post.
     */
    constructor(post) {
        this.postElement = post;
        this.isLiked = false;
        /** The Http element representing the button to trigger to link the post. */
        this.likeButton = post.querySelector(".like-button");
        this.likeButton.addEventListener('click', this.toggleLike.bind(this));

        /** The Http element representing the button to trigger to comment the post. */
        this.seeCommentButton = post.querySelector(".see-comment-button");
        this.seeCommentButton.addEventListener("click", this.toggleCommentVisibility.bind(this));

        /** The comments section */
        this.commentsSection = post.querySelector(".post-comments");  
        this.commentsSection.style.display = "none"; 

        /** The Http element representing the button to trigger to write a comment */
        this.commentButton = post.querySelector(".comment-button");

        /** The element that the user must interact in order to make a comment */
        this.letCommentEl = post.querySelector(".comment-cta");  // This is a form by the way       
        this.letCommentEl.querySelector("button").addEventListener("click", this.letComment.bind(this));
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
            this.commentsSection.style.display = "none"
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
                <p>
                    ${content}
                </p>
            </div>
            `;
        this.commentsSection.insertBefore(commentEl, this.letCommentEl.nextElementSibling);

        // Clear the textEl content
        textEl.value = "";
        textEl.style.height = "auto";
    }
}


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
        conversation.setAttribute('url', conversation_url);
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

        // Make the newly creating conversation dynamic
        new Conversation(conversation);
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

// Creating the conversation objects
let conversations = document.querySelectorAll('.conversation');
conversations.forEach(con => new Conversation(con));

// Make the input used to search user dynamic
new SearchInput(document.querySelector('.search-user-input'));

