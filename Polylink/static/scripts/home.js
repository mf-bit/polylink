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
        this.letCommentEl = post.querySelector(".comment-cta");
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
        if (this.commentsSection.style.display == "none")
            this.commentsSection.style.display = "block";
        else
            this.commentsSection.style.display = "none"
    }

    /**
     * Handles a comment action on a post.
     */
    letComment() {
        let textEl = this.letCommentEl.querySelector("textarea");

        // Make a request to the database to store the comments 
        /* code here */

        // Receive the comment and insert in the comments section, after the comment-cta section (cta stands for call to action if you didn't know 🤧)
        // ======== that is better to let this following handled by the backend later ============
        let content = textEl.value;
        let commentEl = document.createElement("div");
        commentEl.innerHTML = `
            <div class="post-comment">
                <div class="avatar post-avatar">
                    <img src="images/profile-1.jpg" alt="profil">
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
class PostCTA {
    /**
     * Instantiates a new object. I can resist: It is stronger than me commenting even if I know you know 😭
     * @param {HttpElement} postCTA The block representing the post call-to-action section.
     */
    constructor(postCTA) {
        this.postCtaEl = postCTA;
        this.textEl = postCTA.querySelector("textarea");

        /** The button that the user must trigger to attach a image to its post / The input containing the attached images. */
        this.attachButton = postCTA.querySelector(".attach-image-button");
        this.input = postCTA.querySelector("input#attach");
        this.input.addEventListener("change", this.loadAttach.bind(this));

        this.button = postCTA.querySelector("button");
        this.button.addEventListener("click", this.post.bind(this));
    }

    /**
     * Handles the action that consist of posting a new post.
     */
    post() {
        // Retrive and add post to the posts section, just after the post-cta section (the section this object represents then)
        // You better let the backend give you the block's html structur after
        let content = this.textEl.value;
        let postEl = document.createElement("div");
        postEl.innerHTML = `
        <article class="post">
            <div class="post-header">
            <div class="avatar">
                <img src="images/profile-1.jpg" alt="profil">
            </div>
            <div>
                <h4>Lana Rose</h4>
                <p>Dubai, 15 minutes ago</p>
            </div>
            </div>
            <p class="post-text">
                ${content}
            </p>
            <img src="images/feed-1.jpg" alt="Post Content" class="post-image" />
            <div class="post-actions">
            <i class="like-button bi bi-heart"></i>
            <i class="see-comment-button bi bi-chat-dots"></i>
            <i class="comment-button bi bi-pen"></i>
            </div>
            <div class="post-comments">
            <!-- The user write its comment here -->
            <div class="comment-cta">
                <div class="avatar post-avatar">
                <img src="images/profile-1.jpg" alt="profil">
                </div>
                <textarea spellcheck="false" type="text" placeholder="Want to let a comment, Diana?"></textarea>
                <button class="button comment-cta-button">Pin</button>
            </div>
        </article>
        `;
        let feedEl = document.querySelector(".feed");  // the feed represents the block that has the posts, stories, etc. That is the block in the middle of the page
        feedEl.insertBefore(postEl, this.postCtaEl.nextElementSibling)

        // We have to link this new post element to a postObject to make it alive
        new Post(postEl);

        // Clear textarea content
        this.textEl.value = "";
    }

    /** 
     * Loads the attached image (on the front-side, the page) 
     * */
    loadAttach(){
        // Ensures that something is really attach and that that thing is an image: never trust an user input 😒!
        if(this.input.files.length == 0 && !this.isImage(this.input.value))
            return;

        //... to continue
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

// Create Post elements and the PostCTA element
let postList = document.querySelectorAll(".post");
postList.forEach((post) => {
    new Post(post);
})

new PostCTA(document.querySelector(".post-cta"));