" Vim syntax file
" Language: Modeling description language
" Maintainer: Diego Ongaro <ongardie@gmail.com>
" Last Change: Fri Nov  6 16:52:46 PST 2015
" Version: 0
"
" Based on Diego Ongaro's murphi.vim.

if exists("b:current_syntax")
  finish
endif

syntax case ignore
syn keyword modelConditional    as
syn keyword modelStatement      assert
syn keyword modelRepeat         break
syn keyword modelRepeat         continue
syn keyword modelStatement      distribution
syn keyword modelStructure      either
syn keyword modelConditional    else
syn keyword modelRepeat         for
syn keyword modelStatement      function
syn keyword modelConditional    if
syn keyword modelRepeat         in
syn keyword modelStatement      invariant
syn keyword modelConditional    match
syn keyword modelStatement      param
syn keyword modelStatement      print
syn keyword modelStructure      record
syn keyword modelStatement      return
syn keyword modelStatement      rule
syn keyword modelStatement      type
syn keyword modelStatement      var
syn keyword modelRepeat         while

syn keyword modelTodo contained fixme
syn keyword modelTodo contained todo
syn keyword modelTodo contained xxx

syntax case match

" These are case-sensitive:
syn keyword modelStructure      Array
syn keyword modelStructure      Boolean
syn keyword modelBoolean        False
syn keyword modelStructure      MultiSet
syn keyword modelStructure      OrderedSet
syn keyword modelStructure      Set
syn keyword modelBoolean        True
syn keyword modelStructure      Vector
syn keyword modelFunction       capacity
syn keyword modelFunction       contains
syn keyword modelFunction       empty
syn keyword modelFunction       full
syn keyword modelFunction       pop
syn keyword modelFunction       pow
syn keyword modelFunction       push
syn keyword modelFunction       remove
syn keyword modelFunction       size


" Integers.
syn match modelNumber "\<\d\+\>"

" Operators and special characters
syn match modelOperator "[:\+\-\*=<>&|]"
syn match modelDelimiter "[\.,:]"
syn match modelSpecial "[{}\(\)\[\]]"

" Comments. This is defined so late so that it overrides previous matches.
syn region modelComment start="//" end="$" contains=modelTodo
syn region modelComment start="/\*" end="\*/" contains=modelTodo

highlight link modelComment     Comment
highlight link modelString      String
highlight link modelNumber      Number
highlight link modelBoolean     Boolean
highlight link modelIdentifier  Identifier
highlight link modelFunction    Function
highlight link modelStatement   Statement
highlight link modelConditional Conditional
highlight link modelRepeat      Repeat
highlight link modelLabel       Label
highlight link modelOperator    Operator
highlight link modelKeyword     Keyword
highlight link modelType        Type
highlight link modelStructure   Structure
highlight link modelSpecial     Special
highlight link modelDelimiter   Delimiter
highlight link modelError       Error
highlight link modelTodo        Todo

let b:current_syntax = "model"
