"""Dicionário canônico de times da Copa do Mundo 2026.

Única fonte de verdade para:
- `tla`: código FIFA de 3 letras (Brasil=BRA). Usado pelo football-data.org.
- `en`: nome em inglês retornado pelo worldcup26.ir / football-data.org.
- `pt`: nome em português usado no DB (chave do dicionário).

A chave do dicionário é o nome PT exato (com acentos) usado em
`scripts/seed.ts` (campo `timeA`/`timeB`). É assim que `sync_runner` resolve
o TLA do jogo do DB antes de chamar `match_game`.

Caso adicione um time novo, preencha os 3 campos e atualize o teste em
`tests/test_teams.py`.
"""
from __future__ import annotations

from typing import TypedDict


class TeamInfo(TypedDict):
    tla: str
    en: str


TEAM_DICT: dict[str, TeamInfo] = {
    "África do Sul": {"tla": "RSA", "en": "South Africa"},
    "Alemanha": {"tla": "GER", "en": "Germany"},
    "Arábia Saudita": {"tla": "KSA", "en": "Saudi Arabia"},
    "Argélia": {"tla": "ALG", "en": "Algeria"},
    "Argentina": {"tla": "ARG", "en": "Argentina"},
    "Austrália": {"tla": "AUS", "en": "Australia"},
    "Áustria": {"tla": "AUT", "en": "Austria"},
    "Bélgica": {"tla": "BEL", "en": "Belgium"},
    "Bósnia": {"tla": "BIH", "en": "Bosnia-Herzegovina"},
    "Brasil": {"tla": "BRA", "en": "Brazil"},
    "Cabo Verde": {"tla": "CPV", "en": "Cape Verde Islands"},
    "Canadá": {"tla": "CAN", "en": "Canada"},
    "Catar": {"tla": "QAT", "en": "Qatar"},
    "Colômbia": {"tla": "COL", "en": "Colombia"},
    "Congo": {"tla": "COD", "en": "Congo DR"},
    "Coreia do Sul": {"tla": "KOR", "en": "South Korea"},
    "Costa do Marfim": {"tla": "CIV", "en": "Ivory Coast"},
    "Croácia": {"tla": "CRO", "en": "Croatia"},
    "Curaçao": {"tla": "CUW", "en": "Curaçao"},
    "Egito": {"tla": "EGY", "en": "Egypt"},
    "Equador": {"tla": "ECU", "en": "Ecuador"},
    "Escócia": {"tla": "SCO", "en": "Scotland"},
    "Espanha": {"tla": "ESP", "en": "Spain"},
    "EUA": {"tla": "USA", "en": "United States"},
    "França": {"tla": "FRA", "en": "France"},
    "Gana": {"tla": "GHA", "en": "Ghana"},
    "Haiti": {"tla": "HAI", "en": "Haiti"},
    "Holanda": {"tla": "NED", "en": "Netherlands"},
    "Inglaterra": {"tla": "ENG", "en": "England"},
    "Irã": {"tla": "IRN", "en": "Iran"},
    "Iraque": {"tla": "IRQ", "en": "Iraq"},
    "Japão": {"tla": "JPN", "en": "Japan"},
    "Jordânia": {"tla": "JOR", "en": "Jordan"},
    "Marrocos": {"tla": "MAR", "en": "Morocco"},
    "México": {"tla": "MEX", "en": "Mexico"},
    "Noruega": {"tla": "NOR", "en": "Norway"},
    "Nova Zelândia": {"tla": "NZL", "en": "New Zealand"},
    "Panamá": {"tla": "PAN", "en": "Panama"},
    "Paraguai": {"tla": "PAR", "en": "Paraguay"},
    "Portugal": {"tla": "POR", "en": "Portugal"},
    "República Checa": {"tla": "CZE", "en": "Czechia"},
    "Senegal": {"tla": "SEN", "en": "Senegal"},
    "Suécia": {"tla": "SWE", "en": "Sweden"},
    "Suíça": {"tla": "SUI", "en": "Switzerland"},
    "Tunísia": {"tla": "TUN", "en": "Tunisia"},
    "Turquia": {"tla": "TUR", "en": "Turkey"},
    "Uruguai": {"tla": "URY", "en": "Uruguay"},
    "Uzbequistão": {"tla": "UZB", "en": "Uzbekistan"},
}


def get_tla(pt_name: str) -> str | None:
    """Retorna o TLA (código FIFA) de 3 letras a partir do nome PT."""
    info = TEAM_DICT.get(pt_name)
    return info["tla"] if info else None


def get_en(pt_name: str) -> str | None:
    """Retorna o nome em inglês (football-data / worldcup26) a partir do nome PT."""
    info = TEAM_DICT.get(pt_name)
    return info["en"] if info else None


def normalize_name(name: str) -> str:
    """Normaliza nome de time para comparação: lower + strip + sem acentos.

    Útil quando uma API retorna variações do nome (ex: "Cape Verde" vs
    "Cape Verde Islands"). Mas para a Copa 2026 usamos match exato por
    TLA/nome canônico, então essa função é só safety net.
    """
    import unicodedata

    nfkd = unicodedata.normalize("NFKD", name)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()
