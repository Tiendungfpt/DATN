import SearchBar from "../components/SearchBar";
import HotelCard from "../components/HotelCard";
import hotels from "../data/hotels";

export default function Home() {
  return (
    <>
      <section
        className="hero-a25 position-relative d-flex align-items-center justify-content-center text-white"
        style={{
          height: "85vh",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), 
            url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed", 
        }}
      >
        <div className="container position-absolute bottom-0 start-50 translate-middle-x pb-5">
          <SearchBar />
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="row g-4">
            {hotels.slice(0, 3).map((hotel) => (
              <div className="col-md-6 col-lg-4" key={hotel.id}>
                <HotelCard hotel={hotel} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
