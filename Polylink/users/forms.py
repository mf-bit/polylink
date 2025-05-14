from django import forms
import db

class LoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField()

class RegistrationForm(forms.Form):
    username = forms.CharField()
    firstname = forms.CharField()
    lastname = forms.CharField()
    password = forms.CharField()
    confirm_password = forms.CharField()

    def clean_password(self):
        """This ensures that the password is strong enought.
            The password lenght must exceed 'charsMinimum' characters."""
        charsMinimum = 8 # this is the minimum number of characters a password must have

        password = self.cleaned_data.get("password")
        if len(password) >= charsMinimum:
            return password
        else:
            raise forms.ValidationError("The password must contains at least 8 characters.")
        
    def clean_username(self):
        """ This ensures that the specified username is valid. 
            For a username to be valid, it must verifies these conditons:
             - The username must not be already taken
             - The username must not contains spaces"""
        
        username = self.cleaned_data.get("username")
        if ' ' in username:
            raise forms.ValidationError("The username must not contains spaces.")
        elif db.isUsername(username):
            raise forms.ValidationError("This username is already taken.")
        else:
            return username
        
    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        # The password and its confirmations must match
        if password != confirm_password:
            self.add_error("confirm_password", "The confimed password must match the password")

        
        
