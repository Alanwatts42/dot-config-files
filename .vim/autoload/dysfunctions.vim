" This is where all of .vimrc's dark and anti-social thoughts are held
" be careful around this file. Most of the time it 
" just mumbles incoherently and yells at the occasional jehovah's witness
" but there's no telling when it may snap
" and just stab everybody unlucky enough to be riding 
" in the same subway car that day. 

" In fact, this file is SO crazy, I'm thinking of having it... git committed! 
" (drops microphone, nobody laughs, awkardly walks back and picks up microphone) 


function! dysfunctions#IndTxtObj(inner)
  let curline = line(".")
  let lastline = line("$")
  let i = indent(line(".")) - &shiftwidth * (v:count1 - 1)
  let i = i < 0 ? 0 : i
  if getline(".") =~ "^\\s*$"
    return
  endif
  let p = line(".") - 1
  let nextblank = getline(p) =~ "^\\s*$"
  while p > 0 && (nextblank || indent(p) >= i )
    -
    let p = line(".") - 1
    let nextblank = getline(p) =~ "^\\s*$"
  endwhile
  if (!a:inner)
    -
  endif
  normal! 0V
  call cursor(curline, 0)
  let p = line(".") + 1
  let nextblank = getline(p) =~ "^\\s*$"
  while p <= lastline && (nextblank || indent(p) >= i )
    +
    let p = line(".") + 1
    let nextblank = getline(p) =~ "^\\s*$"
  endwhile
  if (!a:inner)
    +
  endif
  normal! $
endfunction
" Code is from: https://vim.fandom.com/wiki/Indent_text_object
