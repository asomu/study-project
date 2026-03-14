import Link from "next/link";

const featureCards = [
  {
    title: "보호자 대시보드",
    description: "학생별 진도, 약점 단원, 오답 유형을 한 화면에서 확인하고 다음 학습 대화를 준비합니다.",
  },
  {
    title: "학생 대시보드",
    description: "최근 7일 정확도와 복습이 필요한 오답을 읽기 중심으로 정리해 학생이 바로 집중할 포인트를 보여줍니다.",
  },
  {
    title: "비공개 베타 운영",
    description: "Mac mini 내부망 운영을 전제로 실제 학습 기록과 업로드를 다루되, 공개 인터넷 노출은 열지 않습니다.",
  },
];

const valueColumns = [
  {
    label: "For Guardians",
    title: "학습 결과를 보는 도구가 아니라 다음 개입을 정하는 화면",
    copy: "최근 부진 단원과 반복 실수를 빠르게 확인하고, 학생 계정 상태와 학습 기록 흐름을 함께 관리합니다.",
  },
  {
    label: "For Students",
    title: "오늘 무엇을 다시 볼지 바로 알 수 있는 학생용 뷰",
    copy: "읽기 중심 대시보드로 최근 성취 흐름과 복습 대상을 압축해서 보여주고, 이후 추천 문제 기능이 바로 이어질 자리를 확보합니다.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(217,119,6,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#fffdf8_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-teal-700 uppercase">Private Beta</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              중학생 수학 학습 흐름을 보호자와 학생이 함께 보는 성취 대시보드
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-300 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-800 transition hover:border-teal-500 hover:text-teal-700"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              보호자 시작하기
            </Link>
          </div>
        </header>

        <main className="flex-1 py-10">
          <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
            <div className="space-y-6">
              <div className="max-w-3xl space-y-4">
                <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  문제를 몇 개 틀렸는지보다 더 중요한 것은 어떤 단원에서, 어떤 유형의 실수가 반복되는지입니다. 이
                  서비스는 보호자용 관리 화면과 학생용 읽기 화면을 분리해 학습 대화를 더 정확하게 시작하도록 설계했습니다.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    보호자 회원가입
                  </Link>
                  <Link
                    href="/student/activate"
                    className="rounded-full border border-amber-300 bg-white/70 px-5 py-3 text-sm font-semibold text-amber-900 transition hover:border-amber-500"
                  >
                    학생 계정 활성화
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {featureCards.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur"
                  >
                    <h2 className="text-base font-semibold text-slate-900">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200/70 bg-slate-950 p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
              <p className="font-mono text-xs tracking-[0.28em] text-teal-300 uppercase">Flow</p>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-200">
                <li>
                  1. 보호자가 가입 후 학생 프로필을 만들고 초대코드를 발급합니다.
                </li>
                <li>
                  2. 학생은 초대코드로 첫 계정을 활성화하고 자기 전용 대시보드에 들어옵니다.
                </li>
                <li>
                  3. 보호자는 기록 입력과 오답 관리로 데이터를 쌓고, 학생은 주간 정확도와 복습 대상을 확인합니다.
                </li>
              </ol>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                개인정보와 운영 원칙
                <p className="mt-2 text-slate-400">
                  현재 단계는 내부망 비공개 베타입니다. 공개 인터넷 배포, 결제, 멀티테넌시는 범위 밖이며 접근 범위는 운영자가
                  통제합니다.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-4 lg:grid-cols-2">
            {valueColumns.map((column) => (
              <article key={column.label} className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm">
                <p className="font-mono text-xs tracking-[0.26em] text-teal-700 uppercase">{column.label}</p>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">{column.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{column.copy}</p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
