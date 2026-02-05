import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Play,
    BookOpen,
    Award,
    Zap,
    CheckCircle2,
    Clock,
    Users,
    Star,
    ChevronRight,
    MonitorPlay,
    FileSearch,
    Cpu,
    Database,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock/Alias local constants to simulate specialized icons or fix ordering
const MasterclassDatabase = Database;
const MasterclassSparkles = Sparkles;

const COURSES = [
    {
        id: "rag-fundamentals",
        title: "RAG Fundamentals for Legal Ops",
        description: "Learn how to bridge the gap between static CFR XML data and dynamic AI retrieval vector stores.",
        level: "Beginner",
        duration: "45 min",
        students: "1.2k",
        rating: 4.8,
        imageColor: "from-blue-500 to-indigo-600",
        icon: MasterclassDatabase
    },
    {
        id: "advanced-prompting",
        title: "Advanced Prompting for Federal Law",
        description: "Master the art of 'Chain-of-Thought' prompting to extract high-precision regulatory citations.",
        level: "Advanced",
        duration: "1.5 hours",
        students: "850",
        rating: 4.9,
        imageColor: "from-violet-500 to-purple-600",
        icon: MasterclassSparkles
    },
    {
        id: "compliance-workflows",
        title: "Automating Compliance Workflows",
        description: "Implementing webhook triggers and Airflow pipelines to auto-ingest new CFR updates.",
        level: "Expert",
        duration: "2 hours",
        students: "420",
        rating: 5.0,
        imageColor: "from-emerald-500 to-teal-600",
        icon: Cpu
    }
];

export default function Masterclass() {
    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            {/* Hero Section */}
            <div className="relative overflow-hidden bg-slate-900 py-16 sm:py-24">
                {/* Background Decorative Image - Using a subtle gradient + overlay since we are in dev */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 opacity-90 pointer-events-none" />
                <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.2),transparent_70%)]" />
                </div>

                <div className="container relative z-10 mx-auto px-4">
                    <div className="max-w-3xl">
                        <Badge className="mb-4 bg-indigo-500/20 text-indigo-300 border-indigo-500/30 backdrop-blur-md">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Premium Training
                        </Badge>
                        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
                            Master the Craft of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Regulatory AI</span>
                        </h1>
                        <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-2xl">
                            Elite education for data engineers and legal professionals. Learn how to architect,
                            ingest, and query the U.S. Code of Federal Regulations with state-of-the-art RAG pipelines.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-12 px-6">
                                <Play className="h-4 w-4 fill-current" />
                                Start Learning Now
                            </Button>
                            <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 gap-2 h-12 px-6">
                                <BookOpen className="h-4 w-4" />
                                View Curriculum
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16 -mt-12">
                {/* Stats bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
                    {[
                        { label: "Active Learners", value: "2.4k+", icon: Users },
                        { label: "Elite Courses", value: "12", icon: Award },
                        { label: "Avg. Precision", value: "98.2%", icon: Zap },
                        { label: "Hours Content", value: "48h+", icon: Clock },
                    ].map((stat, i) => (
                        <Card key={i} className="border-none shadow-xl shadow-slate-200/50 backdrop-blur-xl bg-white/80">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Featured Courses */}
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Featured Curriculums</h2>
                        <p className="text-slate-500 mt-1">Specialized tracks designed by lead RAG architects.</p>
                    </div>
                    <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 font-bold gap-1">
                        Browse all <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {COURSES.map((course) => (
                        <Card key={course.id} className="group overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-white">
                            <div className={cn("h-48 relative overflow-hidden bg-gradient-to-br", course.imageColor)}>
                                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                                    <course.icon className="w-32 h-32 text-white" />
                                </div>
                                <div className="absolute top-4 left-4">
                                    <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 truncate">
                                        {course.level}
                                    </Badge>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-sm pointer-events-none">
                                    <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                        <Play className="h-6 w-6 fill-current ml-1" />
                                    </div>
                                </div>
                            </div>

                            <CardHeader className="p-6">
                                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-2">
                                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {course.duration}</span>
                                    <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {course.students}</span>
                                    <span className="flex items-center gap-1.5 text-amber-500 font-bold"><Star className="h-3 w-3 fill-current" /> {course.rating}</span>
                                </div>
                                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase leading-tight">
                                    {course.title}
                                </CardTitle>
                                <CardDescription className="text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                                    {course.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-6 pt-0 flex items-center justify-between">
                                <Button variant="ghost" className="p-0 h-auto text-indigo-600 hover:text-indigo-700 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                    View Details
                                </Button>
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Enrolled" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="mt-24 relative rounded-3xl overflow-hidden bg-indigo-900 py-16 px-8 text-center border border-indigo-800 shadow-2xl">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
                    </div>
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold text-white mb-4">Ready to Architect Your Own Knowledge Base?</h2>
                        <p className="text-indigo-200 mb-8">
                            Join the Compliance Insight Masterclass today and get certified as a
                            <strong> CFR RAG Engineer</strong>. Exclusive content updated weekly.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <input
                                type="email"
                                placeholder="Enter your corporate email"
                                className="w-full sm:w-80 h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                            />
                            <Button className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-8 h-12 rounded-xl">
                                Get Early Access
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
