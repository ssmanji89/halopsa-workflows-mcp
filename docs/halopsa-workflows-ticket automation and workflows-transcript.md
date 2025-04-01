# HaloPSA Ticket Workflows + Automation Transcript

## Introduction
Hello, happy New Year if you're watching this on day of release. If you're watching this a year later, you'll be really confused, but today is the 5th of January, and I'm just going to apologize first of all for the lack of videos. December was really busy for us at ACPC. If you're not aware, I'm going to self-promote very quickly - I am actually a Halo third-party consultant, and we do this all day every day. We're working with a lot of customers around the world at the minute, basically building Halo for them, doing automations, and all things Halo.

With that out of the way, I'm going to very messily probably build a ticket workflow with you today. I don't script these videos; these are very much off the cuff because I don't have the time now. Unfortunately, today I've been doing this for three hours now, and I've done this three times. I have discovered two bugs, and I have made many mistakes, so I have a rough idea what we're going to do, but let's go through and build this together.

## What Are Ticket Workflows?
So we're talking about ticket workflows - what are ticket workflows, what do they do? Well, ticket workflows are basically how you get from point A to point B in a ticket, which could be open to closed, it could be open, doing stuff, to closed, or as we're going to do today, apply some automations and let the ticket do some of these things for you.

## Creating a Workflow
First things first, I'm going to click Configuration (this is just literally underneath my head, this side down here somewhere, just underneath my head), and I'm going to do Configuration > Tickets and Workflows.

I'm going to make a new workflow, and I am just going to close this page off very quickly. We're going to give this workflow a name, and as you can see, this is the stuff from before, my last 100 attempts, and we're going to call this a completely different name. I'm going to call this:

**Workflow Name: Connor's YouTube Video Workflow**

We're then going to give it a few stages. So I'm going to call:
- **Stage One**: YouTube Triage
- **Stage Two**: Assign the Ticket
- **Stage Three**: Do Something on the Ticket
- **Stage Four**: Closed

These stages are basically what appear on the ticket. It's like a visual indication bar of where you are in the ticket, and I'll show you in a few minutes where they appear. We're just going to save that first of all, and it's going to take us back to this first page. So we've named it, and we've given it a few stages.

## Creating Steps
What I like to do before getting started with any workflow is basically just replicate my stages to my steps:
- At Stage One we have Step One
- At Step Two we have Stage Two, which is going to be called "Assign the Ticket"
- Step Three is going to be Stage Three, which is "Do Something"
- Step Four is going to be "Closed"

So you can actually use "End" here, but I like to have it as a visual indication that I'm at the closed stage of the ticket, and we're going to click save.

## Testing the Workflow with a Ticket Type
So we've now got a workflow. It's not going to do anything; none of these steps are linked together; there's no actions on the ticket, but let's just test to make sure we can get a ticket to actually assign to this workflow.

How do we do that? We're going to go to Ticket Types, and we're going to make a new ticket type. This is for testing purposes, of course, and we're going to call this "Connor's Test YouTube Ticket". 

We're going to do a few things here. We're going to go to the Defaults tab, and we're going to say the initial state is, for any ticket created with this, is "New", and it's going to start a workflow. We're obviously going to start the "Connor's YouTube Video Workflow", and we're just going to assign this to the First Night Support Team.

I want to add a few fields to this so when we make the ticket, we have to do something on it, and I'm going to basically give it a Summary and the Description. No details is what I want - Summary and Details, and click Save.

## Creating a Test Ticket
Then we're going to make a new ticket and just make sure all this works. So we're going to go New Ticket, we're going to go "William", we're going to go "Connor's Test YouTube Ticket". As you can see, we have the two fields: Summary, Details.
- Summary: Test
- Details: Test
And click Submit.

What we should note is now that it starts in this workflow, and we can tell because we have workflow visuals turned on. So you can see we added the four stages: YouTube Triage, Assign the Ticket, Do Something, and then Stage Four, which is Closed Ticket.

Now, as you can see, there's no actions at the top because we've defined no actions yet. And if you don't see this, by the way, on your instance, if you don't see these stages, you need to go to Configuration in the bottom left, go to Tickets > General Settings, and then just scroll down. It's about halfway down the page, and then you basically need to ensure you have enabled "Workflow Progress Visual" and basically "Show the Workflow Stages".

You may notice in your instance that you have the workflow name down here. I actually hide it in my sandbox, but that is the start of this workflow.

## Creating a Custom Field
So the first thing to think about is what do we want to happen at this first stage? Well, in this case, I'm going to do something. I'm going to go down to Configuration > Custom Objects > Custom Fields, and I'm going to go to the second page and click New.

I'm going to basically add a "YouTube Description", okay, and this is actually going to be the "YouTube Custom Field", and I'm going to add two default values. I'm going to make it single selection, so you have to pick from two things, and I'm going to do something funny because I find this funny, not because you will. I'm going to say you have to either:
- Like
- Subscribe
- Comment

So three options on this ticket: Like, Subscribe, or Comment. Brilliant, I'm getting good at this YouTube thing, I think. So, you probably hate it.

So what's that done? Nothing so far. We've made a custom field; it is single selection. You have to either pick from Like, Comment, or Subscribe.

## Creating an Action
We're then going to make an action so that we have a button to press, and we're going to say on that action, show this custom field. So we're going to go to Actions, we're going to do New, and we're going to say this is "YouTube Action". Again, this button name can be anything, and it's completely up to you, but the most important thing, in my opinion, is that we pick a good icon, and I'm going to pick the YouTube Play icon.

I'm going to add some fields to this, and I'm just going to add the custom field YouTube Action and click Save. So basically, when you press this button, it will show you the custom field, which is YouTube Action, then you can pick from that list and click Save.

## Adding the Action to the Workflow
We're then going to go to our workflow, we're then going to go to Edit, we're going to click Add, and we're going to basically say I want to go to the Actions Pane, and I want to add an action here, and I want to allow the action "YouTube Action", and I want to click Save.

What that's done now in our workflow, and you'll see it appear as, you now have YouTube Action. This might not load... Oh, it had loaded YouTube Action, and we can now pick Like, Subscribe, or Comment.

## Deleting and Recreating the Test Ticket
It's going to delete this ticket, and we'll do some more workflow building. I recommend deleting the ticket whenever you update or change the workflow. It can bug out sometimes and break, especially if you're adding in links and steps, and so make sure that you're not doing loads of changes on live tickets, and you can add in actions on live tickets, and it should be fine, but just be conscious of that one, really.

## Setting Up Step Transitions
So I'm going to say that when you select, or when you do the action YouTube Action, I want to then move it. So you'll see under the action here, we have "Move to Step", and I want to say we then move it to the "Assign the Ticket" stage.

For the "Assign the Ticket" stage, I want to do the same thing. So, click on the little pencil in the top right, click Add, and I want to allow the action. I think I have one called Reassign, yes I do, "Reassign", and click Save.

Then, once they've reassigned the ticket, it then wants to move to the "Do Something" stage. So, again, I've just gone into that step and said when you use the action Reassign, move it to "Do Something".

And then at "Do Something", you can either add a comment to the ticket, or you can close the ticket. If you add a comment, you remain at the same step or the same stage, but if you close it, it then wants to move to the step "Closed", like so.

Very basic, very linear workflow to start with, but let's test it all works.

## Testing the Workflow
So we're going to make a new ticket, and we're going to pick the ticket we just made, which is "Connor's Test YouTube Ticket". That Summary: Test, Details: Test, and click Submit.

The first option, as we know, will be the YouTube Action, where we have to basically pick Like, Comment, or Subscribe. And it's saying here, "Do you want to log a response?" What this means is, do you want to email the customer? I'm going to put "No" at this stage. We can override that. I'll show you how to do that soon.

And now we have an action: Like, Subscribe, or Comment. Now, at the minute, it doesn't matter what we pick here, so I'm just going to pick "You need to subscribe to my YouTube channel", and I'm going to go ahead and click Save.

That should then move it to the "Assign the Ticket" stage in the workflow. I can then reassign it, and I'm just going to pick William. So, assign it to William and do Test. It will then move it to the "Do Something" stage in the workflow, where I can add a comment: "I'm doing something", and I can set the status then as "In Progress" and click Save.

It will then remain at this step or this stage because we've not told it to do anything else. But if we click "Close", we can then click "Close", which will move it to the stage "Closed" in the workflow.

Now, the reason it's bugged out and has shown all these actions at the top is because I don't have any actions or anything to do at their closure step. So what we need to do is go into our workflow, and we can do a few things. We can allow the action "Reopen Request". So we open the ticket, and there's also a clever function here, which is basically "End User Update". So if the end user replies to the ticket, what you want it to do? Well, I want it to move back to the "Assign the Ticket" stage, where you have to assign a ticket to someone to then work on it again. I want to go ahead and click Save.

## Adding Automations
So we'll prove this stage works in a minute, but I want to do, before we get down this route, is I want to apply some automations here. This is the fun bit, right? So I want to say that if you click "Like", it does something; if you click "Comment", it does something; or if you click "Subscribe", it does something.

So let's start by making some actions, and I'm going to make three actions. I'm going to put "Video is Liked", click Save. I want to make this an automation. This has to be a quick action, sorry. Make sure you click the quick action button and click Save.

Then, "Video has a Comment". This is a quick action. And I'm going to say "User Subscribed". Brilliant.

And then we're going to go to the workflow, and I'm going to try and do this as slowly as possible because this gets really complicated.

I'm going to add in a step, and I'm going to call this "The Automation Step". It's still Stage One because we don't want it to move to "Assign the Ticket" stage. I'm just going to click Save.

## Setting Up Automation Conditions
And what we're going to say now is, actually, instead of moving straight to Reassign, I want it to go to the Automation Step. So I'm going to move this here to the Automation Step.

And now we need to apply an automation, and I'm going to go to the Automation Step, I'm going to click Add, and I'm going to click Automation. Now, because we've just made those actions quick actions, they will now appear in the list:
- "Video is Liked" - Save
- "Video has a Comment" - Save
- And whatever we call the Subscribe one, sorry, automation: "User has Subscribed" - yeah, and we want to add some conditions in here.

So what we want to say is if the custom field YouTube Action is selected and they click "Like", then perform this automation. I'm going to do the same for "Comment", so YouTube Action "Comment". And we're going to do the same for YouTube Action "Subscribe". Sorry, my bad. "Subscribe" and Save.

There we go. Now what we basically said there is that when you select one of those values in that custom field, move it to the Automation Step and apply essentially a dummy automation action.

## Creating Additional Steps for Each Action
What we then can do is link those things to different steps. So I'm just going to move these over here just to tidy this up a little bit, like this, and we're going to do the font. I'm going to add some more steps. I'm going to say:
- "Video was Liked" - moves over here a bit, more room
- "Video has a Comment"
- And "Video has a Subscription" or, yeah, makes no sense, but stay with me, okay?

I mean, I'll link these to the automation. So what we say is:
- If the video was liked, move it to this step "Video was Liked"
- Video has a comment, move it to the step "Video has a Comment"
- Video was liked, no, "User Subscribed", move it to the step "Video has a Subscription"

Move these over a little bit, and then we can say, we can now add actions to all of these things. What we want to do now, I'm going to be quite simple here, and I'm just going to basically add in the same action for each step, and I'm going to call it "Comment":
- Comment
- Add an action, Comment
- Add another action, Comments

After you've added a comment on the ticket, it will then move to "Assign the Ticket". Again, really bad workflow, please don't use this one:
- Assign the Ticket
- And Assign the Ticket

Like so, let's test it.

## Testing the Enhanced Workflow
If I go to Service Desk and I make a new ticket, and I pick the ticket in that workflow, so this ticket here, and do Test, Test, and click Submit, I can then select YouTube Action. I can pick "The Video is Liked". This should then apply an automation rule.

There we go. Sometimes it can take 10-15 seconds for this automation rule to kick in; otherwise, you can do an F5, which refreshes it. We can now add a comment. Again, we're not at the "Assign a Ticket" stage yet. Brilliant.

"The Video was Liked", okay, this is completely useless, but I'll show you how we can adapt it in a second. We've now added the comment, which has now moved it to the next step, which is "Assign the Ticket".

And then we can then workflow through the simple workflow of assigning the ticket and moving it accordingly.

## Adding Default Notes to Actions
Now, what is the benefit of doing this? Why would you want to do this? Well, in this scenario, I want to let my staff know that there are things they need to do with this ticket now because they've gone to this step.

So I'm just going to go back to my automations very quickly, my actions, and I'm just going to do "Video was Liked". There we go. I'm going to do a default "Video is Light", and I'm going to say down here, I'm going to add a default note: "Please ensure you update spreadsheet of video likes now".

We don't actually do this, by the way. What we're going to do is "Video has a Comment", we're going to go to Default, and we're going to say "Please ensure you reply to the YouTube comment".

We're going to do the same one, which was Subscribed: "Please send a box of chocolates". I wish that was valuable, but the cool thing about this now is that if we go back and make a new ticket in our workflow and we do Test, we can now triage the ticket as we would, and this time we're going to say someone subscribed, and we click Save.

And that will then apply the automation straight away, and it's now said "Please send a box of chocolates". If you wait a few more seconds, that button should appear, and there we go, and then we can add a comment, which is "William, please send box of chocolates using company credit card", and we're gonna assign this to in progress and click Save.

## Conclusion
Again, a very pointless workflow, right? But you see how you can slowly start building up the automation of this and adding in things that step at different stages, different steps to take work away from you. You can even get more granular with this, so we could then change the ticket type to subscription tickets. We could change the user by default, the status, the team, and we can handle all of that at the action. So we can say that if the user has subscribed and we invoke this automation or this action, do these things. So we could say, you know, by default, it changes the team or the agent, and it adds the default note. It can do pretty much anything you want at this stage, to be honest.

It's quite exciting, to be fair. You can add to-do lists from this. You could even spin it off into a new workflow. And so that's all I'm going to do for today because that's obviously quite a lot.

And something that is quite nice, you can also add in knowledge base articles as well. So that will appear on a separate tab, which is quite cool. But there's all sorts you can do with this one. This is just basically, you know, dipping the toes in the water, if you will, getting your feet wet.

And that is it. So basically, what we've done is we've made a full stage over here, a full stage workflow but with multiple steps. And Stage One is you have to pick an option from a custom field, and depending on what you pick will then dictate where that goes in the workflow. You're gonna have to do custom things at that step before it will move stage in the workflow.

I hope this has been helpful. I realize this workflow isn't particularly helpful, but again, it's hard to show you what you need because every MSP is different, every customer is different.

I've been Connor. I hope you have a lovely year ahead of you, and again, if you are watching at the end of the year, I hope you've had a good year. I've been Connor. If you want to reach out to me, my email will be in the comments or the video description below, and I will try and not plug as much in the future, but this is quite fun.

Again, take care. I wish you the best. Speak to you all soon. Bye.
