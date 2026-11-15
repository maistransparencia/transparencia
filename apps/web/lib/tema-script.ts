export const CHAVE_TEMA = "mt-tema";

/** Executado síncrono no <head> para evitar flash: só o tema escuro é opt-in. */
export const scriptAntiFlashTema = `try{if(localStorage.getItem("${CHAVE_TEMA}")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`;
