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
