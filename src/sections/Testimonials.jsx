import GlowCard from '../components/GlowCard'
import TitleHeader from '../components/TitleHeader'
import { testimonials } from '../constants'

const Testimonials = () => {
    return (
        <semantic id='testimonials' classname='flex-center section-padding  '>
            <div className='w-full h-full md:px-10 px-5'>
                <TitleHeader title='What people say about me?'
                    sub='Client Feedback Highlights'
                />
                <div className='lg:columns-3 md:columns-2 columns-1 mt-16'>
                    {testimonials.map((testimonials) => (
                        <GlowCard card={testimonials}>
                            <div className='flex items-center gap-3'>

                            </div>
                        </GlowCard>
                    ))}
                </div>

            </div>
        </semantic>
    )
}

export default Testimonials