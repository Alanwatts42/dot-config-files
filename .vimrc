set nocompatible
filetype plugin on 
syntax on

" Allows the same .vimrc file to be used on both Windows and Linux (WSL)
if has("win32")
  set rtp+=$HOME/vimfiles/bundle/Vundle.vim/
  call vundle#begin('$USERPROFILE/vimfiles/bundle/')
else
  set rtp+=~/.vim/bundle/Vundle.vim/
  call vundle#rc()
endif

" Automatic reloading of .vimrc
autocmd! bufwritepost .vimrc source %

" --Vundle--
Plugin 'VundleVim/Vundle.vim'

" --My-Plugins--
" Additional info for each plugin available by searching single-quoted name on github.
" https://github.com/vim-syntastic/syntastic

" General Formatting
Plugin 'godlygeek/tabular' " Req'd for vim-markdown
Plugin 'plasticboy/vim-markdown'
Plugin 'vimwiki/vimwiki'

" --IDE and Coding--

" Python Code Linting and Syntax Highlighting
Plugin 'vim-airline/vim-airline'  " Adds useful info line bottom of screen
Plugin 'vim-airline/vim-airline-themes'  " Enables themes for vim-airline
Plugin 'vim-syntastic/syntastic'  " Linter - Uses 'Pylint'-See Config Section 
Plugin 'wellle/targets.vim'  " Additional editor commands-see github page  
Plugin 'davidhalter/jedi-vim'  " Python linter/debugger
Plugin 'sentientmachine/Pretty-Vim-Python'  " Python Syntax highlighting
Plugin 'klen/rope-vim'  " Use <leader><j> docs lookup for selected py code 
Plugin 'vim-scripts/indentpython.vim'
Plugin 'tmhedberg/SimpylFold'  " Code folding using <spacebar>
Plugin 'michaeljsmith/vim-indent-object' " See vim-indent-object section below
Plugin 'FooSoft/vim-argwrap'  " Rearrange args within () using <leader><a>
Plugin 'Valloric/YouCompleteMe'  " auto-complete/linter for multiple languages
Plugin 'tpope/vim-repeat'  " I honestly forgot what this one does
Plugin 'tpope/vim-surround'  " easy manipulation of surround chars
Plugin 'tpope/vim-commentary'  " may be dupe w/'tcomment_vim' - (on, testing)
Plugin 'vim-scripts/pylint.vim'  " python linter
Plugin 'thaerkh/vim-workspace'  " let vim manage project workspaces
Plugin 'jalvesaq/vimcmdline'  " run code on external terminal
" Plugin 'tomtom/tcomment_vim'  " gc or gcc to comment/uncomment - (off)
" Plugin 'w0rp/ale' " Redundant Linter until configured correctly - (off)

" Github
Plugin 'tpope/vim-fugitive'
Plugin 'tpope/vim-rhubarb'
Plugin 'junegunn/gv.vim'  " Git diff tool - vim-fugitive req'd
Plugin 'sodapopcan/vim-twiggy'  " Git branch manager - vim-fugitive req'd
Plugin 'airblade/vim-gitgutter'  " Git diff manager
Plugin 'christoomey/vim-conflicted'  " Helps with git merge and rebase conflicts


" Javascript
Plugin 'pangloss/vim-javascript'
Plugin 'mxw/vim-jsx'
Plugin 'leshill/vim-json'

" Look and Feel
Plugin 'reedes/vim-thematic'    " Manage Vim’s appearance

call vundle#end()   " required
filetype plugin indent on   " required
" To ignore plugin indent changes, instead use:
" filetype plugin on


" --Plugin Configuration--

"  :PluginList    - lists configured plugins
"  :PluginInstall   - installs plugins
"  :PluginSearch foo    - searches for foo
"  :PluginClean   - confirms removal of unused plugins;

" --Look & Feel--
colorscheme darkblue

" -Vim-Rope-
map <leader>j :RopeGotoDefinition<CR>
map <leader>r :RopeRename<CR>

" -Vim-Argwrap-
nnoremap <silent> <leader>a :ArgWrap<CR>  " 'FooSoft/vim-argwrap' config

" -Vim Airline-
" Vim-airline theme selector 
let g:airline_theme='lucius'

" Align line-wise comment delimiters flush left instead of following code
" indentation
let g:NERDDefaultAlign = 'left'


" --Vim-Indent-Object--
" Below are config settings for above plugin 'vim-indent-object
" this creates an easy way of selecting entire blocks of code at a time
" which this can do easily for python since it uses indents as a delimiter. " enables 'ai' to select "an indent", and 'ii' to select "an inner indent"" GitHub repo: http://github.com/michaeljsmith/vim-indent-object

onoremap <silent>ai :<C-U>cal <SID>IndTxtObj(0)<CR>
onoremap <silent>ii :<C-U>cal <SID>IndTxtObj(1)<CR>
vnoremap <silent>ai :<C-U>cal <SID>IndTxtObj(0)<CR><Esc>gv
vnoremap <silent>ii :<C-U>cal <SID>IndTxtObj(1)<CR><Esc>gv

" Vim.org page: http://www.vim.org/scripts/script.php?script_id=3037

function! IndTxtObj(inner)
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


" --Syntastic--
" Pylint must be pre-installed, usually with 'pip install pylint'
let g:syntastic_python_checkers = ['pylint']  " Sets 'Pylint' as linter
set statusline+=%#warningmsg#
set statusline+=%{SyntasticStatuslineFlag()}
set statusline+=%*
let g:syntastic_always_populate_loc_list = 1
let g:syntastic_auto_loc_list = 1
let g:syntastic_check_on_open = 1
let g:syntastic_check_on_wq = 0
" Mostly from the reccommended settings for Syntastic from below faq page:
" https://github.com/vim-syntastic/syntastic#faqinfo

" --Non-IDE-Settings--
 
" Text-encoding/shortcut-keys
set encoding=utf-8  " Use utf-8 encoding
let mapleader = ","  " Set <leader> key to ',' <comma>

" Making vim act normal (like every other text editor)
set clipboard=unnamed  " Allows some typical clipboard functions
set ru  " Show cursor position even if inactive
set noeb  " Attempt to silence error dings for console vim
set lazyredraw  " Makes Vim run a bit faster (in theory)
set mouse=a  " Limited mouse functionality
set ww=<,>,h,l  " ww = commands allowed to 'wrap' around EOL

" bind Ctrl+<movement> keys to move around the windows, instead of using Ctrl+w + <movement> 
map <c-j> <c-w>j 
map <c-k> <c-w>k 
map <c-l> <c-w>l 
map <c-h> <c-w>h

" Set <F2> to toggle "paste mode" on/off, which resolves indent issue
" when using ctrl+v to paste into terminal. 
nnoremap <F2> :set invpaste paste?<CR>
set pastetoggle=<F2>
set showmode
" Source: https://vim.fandom.com/wiki/Toggle_auto-indenting_for_code_paste
" Note: typically only necessary if pasting > one line of text


" Turn off buffer activity for file save/resume 
set nobackup
set noswapfile

" Shift+tab = <<  aka backwards <tab> (works in normal mode)
nmap <S-Tab> <<
imap <S-Tab> <Esc><<i

set smarttab  " Enable smarter <tab> behavior 
set backspace=indent,eol,start  " Makes backspace work as it should 


" --'Minimal-Setup'-Options-- 
set bs=2  " backspace=2 allows backspacing over indents and EOLs
set nosol  " nostartofline - prevent cursor from changing column
" --cguckes.net/vim/setup.html--


 set hlsearch  " Highlights what you're searching for
 set incsearch " Searches as you type

" Shortcut to select the text you just searched
noremap gV '[v']

" Allow multiple >> indent without disrupting visual mode (way easier)
vnoremap < <gv
vnoremap > >gv

" Y (capital) yank (copy) from cursor position end of current line
noremap Y y$

" %% = current working directory (useful in ':'  command mode)
inoremap <C-e> <C-o>$

" Find & replace all - <leader>rc (',' is leader for my config so: ',rc'
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/

" Python PEP 8 formatting
au BufNewFile,BufRead *.py
 set tabstop=4     
 set softtabstop=4 
 set shiftwidth=4  
 set textwidth=80   
 set wrap 
 set expandtab      
 set autoindent
 let python_highlight_all=1  " -Python syntax highlighting-
 syntax on
" Auto PEP-8 style formatting for '.py' python files
" tab = 4 spaces, indent = 4 spaces, line wrap after 80 characters, etc.

set number  " IDE style line numbering
set showmatch  " Auto-complete for brackets () [] {}
set sc  " Display incomplete commands

" Execute Python code in current file with <F9>
nnoremap <buffer> <F9> :exec '!python' shellescape(%)<cr>

" ---Javascript---


" Automatically opens new html files with a custom template or 'skeleton'
au BufNewFile *.html    0r ~/.vim/skeleton.html

" Tab settings for .js, .html, .css
au BufNewFile,BufRead *.js, *.html, *.css
 set tabstop=2
 set softtabstop=2
 set shiftwidth=2

" --Experimental-or-Unfinished--
" Theoretical setup for executing javascript code 
" (just took the one for python and replaced 'Python' with
" 'Javascript', it's not certain to work
" autocmd Filetype Javascript nnoremap <buffer> <F9> :exec '!javascript' 
" shellescape(@%, 1)<cr>
