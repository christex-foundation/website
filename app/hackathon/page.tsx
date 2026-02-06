import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code2, Cpu, Globe, Trophy, Users, Rocket, HelpCircle } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function HackathonPage() {
    return (
        <main className="min-h-screen bg-black text-white selection:bg-green-500/30">
            <Header />

            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-black to-black opacity-60" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

                <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 w-full text-center flex flex-col items-center">
                    <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 font-mono text-sm tracking-widest uppercase animate-fade-in-up">
                        Global Online Hackathon
                    </div>

                    <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 animate-fade-in-up delay-100">
                        BUILD THE <br />
                        <span className="text-white hover:text-green-400 transition-colors duration-500">FUTURE</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-10 leading-relaxed font-light animate-fade-in-up delay-200">
                        Join the largest developer competition in the ecosystem. <span className="text-white font-medium">$50,000+</span> in prizes, global impact, and the chance to launch your startup.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-300">
                        <Button size="lg" className="bg-green-500 text-black hover:bg-green-400 font-bold text-lg px-10 h-14 rounded-full">
                            Register Now
                        </Button>
                        <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 font-bold text-lg px-10 h-14 rounded-full">
                            Browse Tracks
                        </Button>
                    </div>

                    <div className="mt-20 flex items-center gap-12 text-gray-500 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                        {/* Placeholders for major sponsor logos */}
                        <div className="text-xl font-bold">SOLANA</div>
                        <div className="text-xl font-bold">Superteam</div>
                        <div className="text-xl font-bold">Christex</div>
                    </div>
                </div>
            </section>

            {/* Global Impact Stats */}
            <section className="border-y border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: "Prize Pool", value: "$50,000+" },
                            { label: "Expect Builders", value: "1,000+" },
                            { label: "Countries", value: "25+" },
                            { label: "Sponsors", value: "10+" },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-4xl md:text-6xl font-black text-white mb-2">{stat.value}</div>
                                <div className="text-sm font-mono text-green-500 uppercase tracking-widest">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tracks Section */}
            <section className="py-32 px-6 lg:px-12 bg-black relative">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-20 text-center">
                        <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase">Tracks</h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Choose your arena. Each track has dedicated prizes and specific challenges designed to push the boundaries of what's possible.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Globe,
                                title: "DeFi & Payments",
                                desc: "Reimagine financial infrastructure. Build seamless payment flows, stablecoin utilities, and decentralized financial tools.",
                                prize: "$10,000"
                            },
                            {
                                icon: Users,
                                title: "Civic Tech",
                                desc: "Empower communities through technology. Build tools for governance, transparency, and public goods.",
                                prize: "$10,000"
                            },
                            {
                                icon: Cpu,
                                title: "AI Agents",
                                desc: "Leverage the power of autonomous agents. Build smart systems that can interact, trade, and assist users.",
                                prize: "$10,000"
                            },
                            {
                                icon: Rocket,
                                title: "Consumer Apps",
                                desc: "Build the next mass adoption app. Social, gaming, or utility apps that bring crypto to the mainstream.",
                                prize: "$10,000"
                            },
                            {
                                icon: Code2,
                                title: "Infrastructure",
                                desc: "Picks and shovels. Build the tools, SDKs, and platforms that other developers will use to build the future.",
                                prize: "$5,000"
                            },
                            {
                                icon: Trophy,
                                title: "University Track",
                                desc: "Dedicated innovation track for students. Show us what the next generation of builders can do.",
                                prize: "$5,000"
                            }
                        ].map((track, i) => (
                            <div key={i} className="p-8 rounded-3xl bg-neutral-900 border border-white/5 hover:border-green-500/50 hover:bg-neutral-900/80 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="text-green-500 -rotate-45" />
                                </div>

                                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:bg-green-500 group-hover:text-black transition-colors">
                                    <track.icon size={28} />
                                </div>

                                <h3 className="text-2xl font-bold mb-4">{track.title}</h3>
                                <p className="text-gray-400 leading-relaxed mb-8 min-h-[5rem]">{track.desc}</p>

                                <div className="inline-block px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 font-mono text-sm">
                                    Prize Pool: {track.prize}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Timeline Section */}
            <section className="py-24 px-6 lg:px-12 border-t border-white/10 bg-neutral-950">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center">Timeline</h2>

                    <div className="relative">
                        <div className="absolute left-1/2 -translate-x-px h-full w-0.5 bg-gradient-to-b from-green-500/50 to-transparent hidden md:block" />

                        {[
                            { date: "May 1st", title: "Registration Opens", desc: "Sign up and form your teams on the platform." },
                            { date: "May 20th", title: "Kickoff Ceremony", desc: "Opening keynote and theme breakdown." },
                            { date: "May 20-22", title: "Hacking Begins", desc: "48 hours of intense building, workshops, and mentorship." },
                            { date: "May 22nd", title: "Submission Deadline", desc: "Submit your projects for judging." },
                            { date: "May 25th", title: "Winners Announced", desc: "Closing ceremony and prize distribution." }
                        ].map((item, i) => (
                            <div key={i} className={`relative flex items-center justify-between md:justify-center mb-12 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                                <div className="hidden md:block w-5/12" />
                                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-4 h-4 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] z-10" />
                                <div className="w-full md:w-5/12 pl-10 md:pl-0 md:px-10">
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors">
                                        <div className="text-green-400 font-mono text-sm mb-2">{item.date}</div>
                                        <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                        <p className="text-gray-400 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6 lg:px-12 bg-black">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-white/10">
                            <AccordionTrigger className="text-lg hover:no-underline hover:text-green-500">Who can participate?</AccordionTrigger>
                            <AccordionContent className="text-gray-400">
                                The hackathon is open to everyone! Students, professionals, and hobbyists from all backgrounds are welcome. You can participate individually or in teams of up to 5 members.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border-white/10">
                            <AccordionTrigger className="text-lg hover:no-underline hover:text-green-500">Do I need to know Solana?</AccordionTrigger>
                            <AccordionContent className="text-gray-400">
                                While knowledge of Solana/Rust is helpful, it is not strictly required. We have tracks for various skill levels and provide workshops to help you get started.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3" className="border-white/10">
                            <AccordionTrigger className="text-lg hover:no-underline hover:text-green-500">Is it free to join?</AccordionTrigger>
                            <AccordionContent className="text-gray-400">
                                Yes, participation is completely free.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-white/10">
                            <AccordionTrigger className="text-lg hover:no-underline hover:text-green-500">Who owns the IP?</AccordionTrigger>
                            <AccordionContent className="text-gray-400">
                                You own 100% of the intellectual property of the project you build.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            <Footer />
        </main>
    )
}
