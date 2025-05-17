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
    }
}

/**
 * This represents the post-cta section. 
 * @class
 */
class PostCTAWrapper {
    /**
     * Instantiates a new object. I can resist: It is stronger than me commenting even if I know you know 😭
     * @param {HttpElement} postCTAWrapper The block representing the post call-to-action section.
     */
    constructor(postCTAWrapper) {
        this.postCTAWrapperEl = postCTAWrapper;  // this is a form by the way
        this.textEl = postCTAWrapper.querySelector("textarea");

        /** The button that the user must trigger to attach a image to its post / The input containing the attached images. */
        this.attachButton = postCTAWrapper.querySelector(".attach-image-button");
        this.input = postCTAWrapper.querySelector("input#attach");
        this.input.addEventListener("change", this.loadAttach.bind(this));

        this.button = postCTAWrapper.querySelector("button");
        this.button.addEventListener("click", this.post.bind(this));

        /** The section containing any uploaded attachement */
        this.attachSection = postCTAWrapper.querySelector(".attach-wrapper");

        /** The image element containing the uploaded attachement */
        this.attachImgEl = postCTAWrapper.querySelector(".attach-wrapper img");

        /** The button to click on in order to discard a chosen attachement */
        this.discardAttachButton = postCTAWrapper.querySelector(".attach-wrapper .discard-attach");
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
        this.postCTAWrapperEl.submit();
        
        // Retrive and add post to the posts section, just after the post-cta section (the section this object represents then)
        // You better let the backend give you the block's html structur after
        let content = this.textEl.value;
        let postEl = document.createElement("div");
        // The cross-validation token inserted by Django
        let csrf_value= this.postCTAWrapperEl.querySelector("input[name='csrfmiddlewaretoken']").value;
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
            </div>
            <p class="post-text">
                ${content}
            </p>
            <img src=${this.attachImgEl.src} alt="Post Content" class="post-image" />

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
        this.discardAttach();
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

// ===================================================================================
// ===================================================================================

// Handle the autoresize textareas
const postInputEls = document.querySelectorAll("textarea");
postInputEls.forEach((postInputEl) => {
    postInputEl.addEventListener("input", () => {
        postInputEl.style.height = "auto";
        postInputEl.style.height = (postInputEl.scrollHeight + 2) + "px";
    }
    )
})

// Create Post elements and the PostCTAWrapper element
let postList = document.querySelectorAll(".post");
postList.forEach((post) => {
    new Post(post);
})

new PostCTAWrapper(document.querySelector(".post-cta-wrapper"));

// const file = document.querySelector(".post-cta input").files[0];
// const reader = new FileReader();
// reader.onload = function(event){
//     const reader = event.target;
//     console.log(`Result: ${reader.result}`);
// }

// // reader.readAsText(file);
// reader.readAsDataURL(file);
// console.log(reader.result)
