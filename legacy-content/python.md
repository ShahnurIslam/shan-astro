---
title: "Python"
date: 2018-12-18T15:36:35Z
subtitle: ""
tags: [python, pandas]
toc: yes
---

# Table of Contents
- [Table of Contents](#table-of-contents)
- [Pandas](#pandas)
    - [Pandas Conditonal Column](#pandas-conditonal-column)
    - [Applying functions to Pandas columns](#applying-functions-to-pandas-columns)
    - [Converting strings to date or datetime](#converting-strings-to-date-or-datetime)


# Pandas
### Pandas Conditonal Column

A conditional column is a column in a dataframe that is generated based on other column/s. There are multiple way of doing this in Python but one of the quickest ways is to use the `np.where()` function. This function is basically the equivalent of an if statement in Excel.

`np.where(condition,True action, False action)`

``` python
#import the two libraries
import numpy as np
import pandas as pd

#generate a pandas dataframe of one column with a 100 random integers
df = pd.DataFrame(np.random.randint(low=0,high = 100,size = (100,1)),columns = ['col1'])

#Generate a conditional column that checks if the number is even or odd
df['odd/even'] = np.where(df['col1'] % 2 == 1, 'odd', 'even')
```
If we print the first 5 rows of our data frame we get :

       col1 odd/even
    0    87      odd
    1    85      odd
    2    22     even
    3    80     even
    4     0     even

---
    
### Applying functions to Pandas columns

We want to manipulate all the values in one column with a function with created. It's actually quite simple as Pandas series have an `.apply` method. An example below

``` python
#import the two libraries
import numpy as np
import pandas as pd

#generate a pandas dataframe of one column with a 100 random integers
df = pd.DataFrame(np.random.randint(low=0,high = 100,size = (100,1)),columns = ['col1'])

#create a function that multiplies a number by two
def multiply_by_2(number):
    val = number * 2
    return val

#test it on single value
print(multiply_by_2(2))

4

#Create a second column that is based on multiplying the first column by 2
df['col2'] = df['col1'].apply(multiply_by_2)
```
If we print the first 5 rows of our data frame we get :
```
       col1  col2
    0    81   162
    1    26    52
    2     6    12
    3    80   160
    4    35    70
```

### Converting strings to date or datetime
It would be nice if the whole word worked with ISO dates. Sadly that is not the case, if you've read in a dataframe and want to convert a column to date time. 
For example, you've read in the data and the dataframe looks like this:

```
         date         col2
    0    01/01/2021   162
    1    02/01/2021   123
    2    03/01/2021   87
    3    04/01/2021   170

```
We can simply convert this to date using `pandas.to_datetime` function. You simply pass the series and format you need to convert

```python
df['date'] = pd.to_datetime(df['date'],format='%d/%m/%Y')
```
To determine the format, you can use this table 
<table border="1">
<tbody><tr><td>Code</td><td>Meaning</td><td>Code</td><td>Meaning</td></tr>
<tr><td><tt>%a</tt></td><td>Abbreviated weekday</td><td><tt>%A</tt></td><td>Full weekday</td></tr>
<tr><td><tt>%b</tt></td><td>Abbreviated month</td><td><tt>%B</tt></td><td>Full month</td></tr>
<tr><td><tt>%c</tt></td><td>Locale-specific date and time</td><td><tt>%d</tt></td><td>Decimal date</td></tr>
<tr><td><tt>%H</tt></td><td>Decimal hours (24 hour)</td><td><tt>%I</tt></td><td>Decimal hours (12 hour)</td></tr>
<tr><td><tt>%j</tt></td><td>Decimal day of the year</td><td><tt>%m</tt></td><td>Decimal month</td></tr>
<tr><td><tt>%M</tt></td><td>Decimal minute</td><td><tt>%p</tt></td><td>Locale-specific AM/PM</td></tr>
<tr><td><tt>%S</tt></td><td>Decimal second</td><td><tt>%U</tt></td><td>Decimal week of the year (starting on Sunday)</td></tr>
<tr><td><tt>%w</tt></td><td>Decimal Weekday (0=Sunday)</td><td><tt>%W</tt></td><td>Decimal week of the year (starting on Monday)</td></tr>
<tr><td><tt>%x</tt></td><td>Locale-specific Date</td><td><tt>%X</tt></td><td>Locale-specific Time</td></tr>
<tr><td><tt>%y</tt></td><td>2-digit year</td><td><tt>%Y</tt></td><td>4-digit year</td></tr>
<tr><td><tt>%z</tt></td><td>Offset from GMT</td><td><tt>%Z</tt></td><td>Time zone (character)</td></tr></tbody></table>

[//]: <> (## SQL Windows Function)

