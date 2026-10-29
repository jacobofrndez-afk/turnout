"use client";
import { useState } from 'react';

export function BoardActions(){
 const [error,setError]=useState('');
 async function fullscreen(){
  try{const board=document.querySelector<HTMLElement>('.campaign-board');if(!board?.requestFullscreen)throw new Error();await board.requestFullscreen();setError('');}
  catch{setError('Full screen is unavailable in this browser. The board is still ready to print.');}
 }
 return <div className="board-controls"><button className="action-button" type="button" onClick={()=>window.print()}>Print the board</button><button className="action-button secondary" type="button" onClick={()=>void fullscreen()}>Show on a screen</button><small>A4 or Letter · Save as PDF in the print dialog</small>{error&&<p role="status">{error}</p>}</div>;
}

export function BoardScreenExit(){
 return <button type="button" className="board-screen-exit" onClick={()=>void document.exitFullscreen()}>Exit full screen</button>;
}
