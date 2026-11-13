import { useId } from 'react';
import { cn } from '../../lib/cn';
import { LOGO } from './logoPaths';

// Gradiente do "Comanda", com as cores medidas nos arquivos oficiais de logo:
//  - laranja: logo para fundo claro
//  - azul: logo para fundo escuro
// Para a logo escura usar o laranja também, basta trocar `escuro` por 'laranja' abaixo.
const GRADIENTES = { laranja: ['#FF5A00', '#FF2827'] };
const GRADIENTE_DO_TEMA = { claro: 'laranja', escuro: 'laranja' };

const { simbolo, texto } = LOGO;

// Três formas de montar o desenho (medidas no mesmo sistema de coordenadas dos caminhos):
const ESCALA_NOME = 2; // lado a lado: o nome tem 2x o tamanho que teria na logo original
const ESPACO_LADO_A_LADO = 520;
const LAYOUTS = {
  // só o símbolo (cloche)
  simbolo: { largura: simbolo.largura, altura: simbolo.altura, simbolo: { x: 0, y: 0 }, nome: null },
  // símbolo e nome lado a lado (cabeçalhos)
  horizontal: {
    largura: simbolo.largura + ESPACO_LADO_A_LADO + texto.largura * ESCALA_NOME,
    altura: simbolo.altura,
    simbolo: { x: 0, y: 0 },
    nome: {
      x: simbolo.largura + ESPACO_LADO_A_LADO,
      y: (simbolo.altura - texto.altura * ESCALA_NOME) / 2,
      escala: ESCALA_NOME,
    },
  },
  // símbolo em cima, nome embaixo (a logo oficial; telas de entrada)
  vertical: {
    largura: texto.largura,
    altura: simbolo.altura + LOGO.espaco + texto.altura,
    simbolo: { x: LOGO.deslocamentoSimbolo, y: 0 },
    nome: { x: 0, y: simbolo.altura + LOGO.espaco, escala: 1 },
  },
};

/**
 * Logo do Pronta Comanda em SVG, nítida em qualquer tamanho. A cor do símbolo e de "Pronta"
 * vem de `currentColor` (use `text-ink`, `text-white`...), então acompanha o tema sozinha.
 * O tamanho vem da altura: `className="h-16"`.
 *
 * - showName: símbolo + nome lado a lado
 * - vertical: símbolo sobre o nome (logo oficial)
 * - gradiente (cor do "Comanda"): 'auto' segue o tema (laranja no claro, azul no escuro),
 *   'laranja' ou 'azul' fixam a cor, 'mono' usa a mesma cor do resto da logo.
 */
export function Logo({ className, showName = false, vertical = false, gradiente = 'auto' }) {
  // id único por logo: um gradiente declarado dentro de um SVG escondido não vale para outro
  const id = useId().replace(/:/g, '');
  const layout = LAYOUTS[vertical ? 'vertical' : showName ? 'horizontal' : 'simbolo'];
  const comNome = layout.nome !== null;

  return (
    <span className={cn('inline-flex items-center', className)}>
      <svg
        viewBox={`0 0 ${layout.largura} ${layout.altura}`}
        className="h-full w-auto"
        role="img"
        aria-label="Pronta Comanda"
      >
        {comNome && gradiente !== 'mono' && (
          <defs>
            {Object.entries(GRADIENTES).map(([nome, [de, ate]]) => (
              <linearGradient
                key={nome}
                id={`${id}-${nome}`}
                gradientUnits="userSpaceOnUse"
                x1={LOGO.gradiente[0]}
                x2={LOGO.gradiente[1]}
                y1="0"
                y2="0"
              >
                <stop offset="0" stopColor={de} />
                <stop offset="1" stopColor={ate} />
              </linearGradient>
            ))}
          </defs>
        )}

        <path
          transform={`translate(${layout.simbolo.x} ${layout.simbolo.y})`}
          d={simbolo.d}
          fill="currentColor"
          fillRule="evenodd"
        />

        {comNome && (
          <g
            transform={`translate(${layout.nome.x} ${layout.nome.y}) scale(${layout.nome.escala})`}
            fillRule="evenodd"
          >
            <path d={LOGO.pronta} fill="currentColor" />
            {gradiente === 'mono' ? (
              <path d={LOGO.comanda} fill="currentColor" />
            ) : gradiente === 'auto' ? (
              <>
                <path d={LOGO.comanda} fill={`url(#${id}-${GRADIENTE_DO_TEMA.claro})`} className="dark:hidden" />
                <path d={LOGO.comanda} fill={`url(#${id}-${GRADIENTE_DO_TEMA.escuro})`} className="hidden dark:block" />
              </>
            ) : (
              <path d={LOGO.comanda} fill={`url(#${id}-${gradiente})`} />
            )}
          </g>
        )}
      </svg>
    </span>
  );
}
