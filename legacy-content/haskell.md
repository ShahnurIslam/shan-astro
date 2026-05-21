---
title: "Haskell"
date: 2020-04-21T22:24:44+01:00
tags: [haskell]
---

Structure of a main script with let and do syntax. Save in a script e.g. example.hs

```haskell
main :: IO ()
main = do
  let
    printString = "Hi"
    number = 3
  putStrLn printString
  (putStrLn . show) number


```
To compile and run we use `stack exec -- runghc example.hs`