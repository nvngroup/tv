# Logos das rádios

As imagens locais ficam em `public/radios/`, em WebP com até 192 pixels por lado.
`src/data/logosRadios.json` associa o endereço de cada stream ao arquivo, nome da
emissora e URL de origem da imagem. Arquivos iguais compartilham o mesmo nome,
calculado pelo conteúdo.

O levantamento usa as imagens do catálogo `radios.txt` e os sites e ícones
informados pelo [Radio Browser](https://docs.radio-browser.info/), consultado em
23/10/2026. As correspondências usam o stream ou o nome normalizado completo;
nomes que contêm apenas frequência exigem correspondência de stream. As imagens
são baixadas e decodificadas antes de entrar no projeto. As marcas pertencem às
respectivas emissoras.

`LogoRadio` tenta primeiro o arquivo local, depois as fontes externas disponíveis.
Durante o carregamento e quando todas as fontes falham, mostra um ícone de rádio.
A mesma lógica atende os cartões e a rádio em reprodução. O catálogo, os streams
e os favoritos continuam independentes das imagens.

Para atualizar um logo, confirme a emissora, salve a imagem otimizada e atualize
a entrada correspondente no manifesto, mantendo a URL de origem para consulta.
