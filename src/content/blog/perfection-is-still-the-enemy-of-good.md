---
title: "Perfection is still the enemy of good"
description: "A short reflection on pricing, A/B testing and making business decisions without perfect evidence."
pubDate: 2026-05-19
tags: ["pricing", "A/B testing", "experimentation", "data science"]
draft: true
---


The last post I did on my own blog was called *"Perfection is the enemy of good."* Years later, after working in pricing, forecasting and A/B testing. I think I understand that phrase in a more practical way.

**In commercial data science, you almost never get perfect conditions.**

You get:

* partial data
* small sample sizes
* noisy experiments
* leakage
* overlapping experiments
* operational constraints
* deployment bugs
* stakeholders who are really, really impatient and want to know if it's working

That's especially true in pricing. An A/B experiment can look like it's not significant but still be useful.

And the opposite can also happen: a test can be conclusive and still not be useful.

> Sometimes the question is not whether the experiment “won”. It is whether we should roll it out, and what the cost is if we are wrong.

That's what businesses care about. Most stakeholders do not care about statistical significance in isolation. They care about what the result means for the business.

They don't care how much power the test has or what kind of alpha, power or p values you're using.

They care about questions like:

* How will us rolling this out impact the business?
* How certain are we?
* What are the risks and trade offs?
* What is the estimated commercial uplift, whether that is incremental revenue, margin improvement or cost saved?
