import React from 'react'
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
                    {testimonials}
                </div>

            </div>
        </semantic>
    )
}

export default Testimonials